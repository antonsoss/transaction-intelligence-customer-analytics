#!/usr/bin/env python3
"""Build and validate a local relational DuckDB database from the raw Berka snapshot."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    project_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description="Build a constrained local DuckDB database from the raw Berka CSV snapshot."
    )
    parser.add_argument("--raw-dir", type=Path, default=project_root / "data" / "raw")
    parser.add_argument(
        "--database",
        type=Path,
        default=project_root / "data" / "interim" / "berka.duckdb",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace the existing local database and validation report.",
    )
    return parser.parse_args()


def quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def quote_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def duckdb_type(column: dict[str, Any]) -> str:
    """Map source MariaDB types to conservative DuckDB analytical types."""
    data_type = column["data_type"].lower()
    column_type = column["column_type"].lower()

    if data_type in {"tinyint", "smallint", "mediumint", "int", "integer", "bigint", "year"}:
        return "UBIGINT" if "unsigned" in column_type else "BIGINT"
    if data_type in {"decimal", "numeric"}:
        match = re.search(r"\((\d+),(\d+)\)", column_type)
        if match and int(match.group(1)) <= 38:
            return f"DECIMAL({match.group(1)},{match.group(2)})"
        return "DOUBLE"
    if data_type in {"float", "double", "real"}:
        return "DOUBLE"
    if data_type == "date":
        return "DATE"
    if data_type in {"datetime", "timestamp"}:
        return "TIMESTAMP"
    if data_type == "time":
        return "TIME"
    if data_type in {"binary", "varbinary", "blob", "tinyblob", "mediumblob", "longblob"}:
        return "BLOB"
    if data_type in {"bool", "boolean"}:
        return "BOOLEAN"
    return "VARCHAR"


def grouped_foreign_keys(table_metadata: dict[str, Any]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for relationship in table_metadata["foreign_keys"]:
        grouped[relationship["constraint"]].append(relationship)

    result = []
    for constraint, relationships in sorted(grouped.items()):
        relationships.sort(key=lambda item: item.get("ordinal_position", 1))
        referenced_tables = {item["referenced_table"] for item in relationships}
        if len(referenced_tables) != 1:
            raise ValueError(f"Foreign key {constraint} references multiple tables")
        result.append(
            {
                "constraint": constraint,
                "columns": [item["column"] for item in relationships],
                "referenced_table": relationships[0]["referenced_table"],
                "referenced_columns": [item["referenced_column"] for item in relationships],
            }
        )
    return result


def table_order(tables: dict[str, Any]) -> list[str]:
    """Order parent tables before child tables so foreign keys can be declared and loaded."""
    dependencies = {
        table: {
            relationship["referenced_table"]
            for relationship in grouped_foreign_keys(metadata)
            if relationship["referenced_table"] in tables
            and relationship["referenced_table"] != table
        }
        for table, metadata in tables.items()
    }
    ordered: list[str] = []
    remaining = set(tables)

    while remaining:
        ready = sorted(table for table in remaining if dependencies[table] <= set(ordered))
        if not ready:
            cycle = ", ".join(sorted(remaining))
            raise ValueError(f"Foreign-key dependency cycle detected among: {cycle}")
        ordered.extend(ready)
        remaining.difference_update(ready)
    return ordered


def create_table_sql(table: str, metadata: dict[str, Any]) -> str:
    definitions = []
    for column in metadata["columns"]:
        definition = f"{quote_identifier(column['name'])} {duckdb_type(column)}"
        if not column["nullable"]:
            definition += " NOT NULL"
        definitions.append(definition)

    primary_key = metadata["primary_key"]
    if primary_key:
        columns = ", ".join(quote_identifier(column) for column in primary_key)
        definitions.append(f"PRIMARY KEY ({columns})")

    for relationship in grouped_foreign_keys(metadata):
        columns = ", ".join(quote_identifier(column) for column in relationship["columns"])
        referenced_columns = ", ".join(
            quote_identifier(column) for column in relationship["referenced_columns"]
        )
        definitions.append(
            f"FOREIGN KEY ({columns}) REFERENCES "
            f"{quote_identifier(relationship['referenced_table'])} ({referenced_columns})"
        )

    body = ",\n    ".join(definitions)
    return f"CREATE TABLE {quote_identifier(table)} (\n    {body}\n)"


def verify_snapshot(raw_dir: Path, manifest: dict[str, Any]) -> None:
    schema_path = raw_dir / manifest["schema_file"]
    if not schema_path.is_file():
        raise FileNotFoundError(f"Missing source schema: {schema_path}")
    if sha256(schema_path) != manifest["schema_sha256"]:
        raise ValueError(f"Checksum mismatch: {schema_path}")

    for table, metadata in manifest["tables"].items():
        csv_path = raw_dir / metadata["file"]
        if not csv_path.is_file():
            raise FileNotFoundError(f"Missing raw table: {csv_path}")
        if sha256(csv_path) != metadata["sha256"]:
            raise ValueError(f"Checksum mismatch: {csv_path}")


def validate_relationships(connection: Any, tables: dict[str, Any]) -> list[dict[str, Any]]:
    results = []
    for table, metadata in tables.items():
        for relationship in grouped_foreign_keys(metadata):
            child_alias = "child"
            parent_alias = "parent"
            joins = " AND ".join(
                f"{child_alias}.{quote_identifier(child)} = "
                f"{parent_alias}.{quote_identifier(parent)}"
                for child, parent in zip(
                    relationship["columns"], relationship["referenced_columns"], strict=True
                )
            )
            populated = " AND ".join(
                f"{child_alias}.{quote_identifier(column)} IS NOT NULL"
                for column in relationship["columns"]
            )
            missing_parent = (
                f"{parent_alias}.{quote_identifier(relationship['referenced_columns'][0])} IS NULL"
            )
            query = f"""
                SELECT COUNT(*)
                FROM {quote_identifier(table)} AS {child_alias}
                LEFT JOIN {quote_identifier(relationship['referenced_table'])} AS {parent_alias}
                  ON {joins}
                WHERE {populated} AND {missing_parent}
            """
            orphan_count = connection.execute(query).fetchone()[0]
            results.append(
                {
                    "constraint": relationship["constraint"],
                    "table": table,
                    "columns": relationship["columns"],
                    "referenced_table": relationship["referenced_table"],
                    "referenced_columns": relationship["referenced_columns"],
                    "orphan_count": orphan_count,
                    "valid": orphan_count == 0,
                }
            )
    return results


def main() -> int:
    args = parse_args()
    raw_dir = args.raw_dir.resolve()
    database_path = args.database.resolve()
    report_path = database_path.parent / "relationship_validation.json"
    manifest_path = raw_dir / "download_manifest.json"

    if not manifest_path.is_file():
        print(f"Missing download manifest: {manifest_path}", file=sys.stderr)
        return 1
    if (database_path.exists() or report_path.exists()) and not args.overwrite:
        print("Local database already exists; use --overwrite to replace it.", file=sys.stderr)
        return 2

    try:
        import duckdb
    except ImportError:
        print("DuckDB is missing. Run: pip install -e '.[dev]'", file=sys.stderr)
        return 1

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        verify_snapshot(raw_dir, manifest)
        tables = manifest["tables"]
        ordered_tables = table_order(tables)
    except (FileNotFoundError, KeyError, OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Invalid raw snapshot: {error}", file=sys.stderr)
        return 1

    database_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = database_path.with_suffix(database_path.suffix + ".part")
    temporary_path.unlink(missing_ok=True)
    connection = None

    try:
        connection = duckdb.connect(str(temporary_path))
        table_counts = {}

        for table in ordered_tables:
            metadata = tables[table]
            print(f"Creating {table}...")
            connection.execute(create_table_sql(table, metadata))
            csv_path = raw_dir / metadata["file"]
            copy_sql = (
                f"COPY {quote_identifier(table)} FROM {quote_literal(str(csv_path))} "
                f"(FORMAT CSV, HEADER TRUE, NULL {quote_literal(manifest['null_marker'])})"
            )
            connection.execute(copy_sql)
            local_count = connection.execute(
                f"SELECT COUNT(*) FROM {quote_identifier(table)}"
            ).fetchone()[0]
            expected_count = metadata["source_row_count"]
            if local_count != expected_count:
                raise RuntimeError(
                    f"Row-count mismatch for {table}: expected {expected_count:,}, "
                    f"loaded {local_count:,}"
                )
            table_counts[table] = local_count

        relationships = validate_relationships(connection, tables)
        invalid = [relationship for relationship in relationships if not relationship["valid"]]
        if invalid:
            raise RuntimeError(f"{len(invalid)} foreign-key relationships contain orphaned rows")

        connection.close()
        connection = None
        temporary_path.replace(database_path)

        report = {
            "validated_at_utc": datetime.now(UTC).isoformat(),
            "source_manifest": str(manifest_path),
            "database": str(database_path),
            "table_counts": table_counts,
            "relationships": relationships,
            "valid": True,
        }
        report_path.write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
    except (OSError, RuntimeError, ValueError, duckdb.Error) as error:
        print(f"Could not build local database: {error}", file=sys.stderr)
        return 1
    finally:
        if connection is not None:
            connection.close()
        temporary_path.unlink(missing_ok=True)

    print(f"Local relational database: {database_path}")
    print(f"Relationship validation: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

