"""Download the Berka financial database as raw CSV table snapshots."""

from __future__ import annotations

import argparse
import csv
import getpass
import hashlib
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

DEFAULT_HOST = "relational.fel.cvut.cz"
DEFAULT_PORT = 3306
DEFAULT_USER = "guest"
DEFAULT_DATABASE = "financial"
SOURCE_URL = "https://relational.fel.cvut.cz/dataset/Financial"
EXPECTED_TABLES = ("account", "card", "client", "disp", "district", "loan", "order", "trans")
NULL_MARKER = r"\N"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export the CTU Berka financial database to data/raw as CSV files."
    )
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", default=DEFAULT_PORT, type=int)
    parser.add_argument("--user", default=DEFAULT_USER)
    parser.add_argument("--database", default=DEFAULT_DATABASE)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "raw",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace an existing raw snapshot.",
    )
    return parser.parse_args()


def get_password() -> str:
    """Read the database password without storing it in source control."""
    password = os.environ.get("BERKA_DB_PASSWORD")
    if password:
        return password
    return getpass.getpass("Database password (BERKA_DB_PASSWORD): ")


def sha256(path: Path) -> str:
    """Calculate the SHA-256 checksum of a downloaded table."""
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def available_tables(connection: Any) -> set[str]:
    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        return {row[0] for row in cursor.fetchall()}


def source_create_statement(connection: Any, table: str) -> str:
    """Return the source MariaDB CREATE TABLE statement."""
    with connection.cursor() as cursor:
        cursor.execute(f"SHOW CREATE TABLE `{table}`")
        statement = cursor.fetchone()[1]
    return statement.rstrip(";\n") + ";"


def source_table_metadata(connection: Any, database: str, table: str) -> dict[str, Any]:
    """Read an exact row count and relational schema metadata from MariaDB."""
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
        source_row_count = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
            ORDER BY ORDINAL_POSITION
            """,
            (database, table),
        )
        columns = [
            {
                "name": name,
                "data_type": data_type,
                "column_type": column_type,
                "nullable": nullable == "YES",
            }
            for name, data_type, column_type, nullable in cursor.fetchall()
        ]

        cursor.execute(
            """
            SELECT COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = %s
              AND CONSTRAINT_NAME = 'PRIMARY'
            ORDER BY ORDINAL_POSITION
            """,
            (database, table),
        )
        primary_key = [row[0] for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT CONSTRAINT_NAME, COLUMN_NAME, ORDINAL_POSITION,
                   REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = %s
              AND REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION
            """,
            (database, table),
        )
        foreign_keys = [
            {
                "constraint": constraint,
                "column": column,
                "ordinal_position": ordinal_position,
                "referenced_table": referenced_table,
                "referenced_column": referenced_column,
            }
            for constraint, column, ordinal_position, referenced_table, referenced_column
            in cursor.fetchall()
        ]

    return {
        "source_row_count": source_row_count,
        "columns": columns,
        "primary_key": primary_key,
        "foreign_keys": foreign_keys,
    }


def export_table(connection: Any, table: str, destination: Path) -> int:
    """Stream a database table to CSV and atomically publish the completed file."""
    temporary = destination.with_suffix(destination.suffix + ".part")
    row_count = 0

    try:
        with connection.cursor() as cursor, temporary.open(
            "w", newline="", encoding="utf-8"
        ) as file:
            cursor.execute(f"SELECT * FROM `{table}`")
            columns = [description[0] for description in cursor.description]
            writer = csv.writer(file)
            writer.writerow(columns)

            while rows := cursor.fetchmany(10_000):
                writer.writerows(
                    tuple(NULL_MARKER if value is None else value for value in row)
                    for row in rows
                )
                row_count += len(rows)
                print(f"\r  {table}: {row_count:,} rows", end="", flush=True)

        temporary.replace(destination)
        print()
        return row_count
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def main() -> int:
    args = parse_args()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    destinations = [output_dir / f"{table}.csv" for table in EXPECTED_TABLES]
    manifest_path = output_dir / "download_manifest.json"
    schema_path = output_dir / "schema_mariadb.sql"
    existing = [path for path in [*destinations, manifest_path, schema_path] if path.exists()]
    if existing and not args.overwrite:
        print("Raw snapshot already exists; use --overwrite to replace it:", file=sys.stderr)
        for path in existing:
            print(f"  {path}", file=sys.stderr)
        return 2

    try:
        import pymysql
        from pymysql.cursors import SSCursor
    except ImportError:
        print("PyMySQL is missing. Run: pip install -e '.[dev]'", file=sys.stderr)
        return 1

    print(f"Connecting to {args.host}:{args.port}/{args.database} as {args.user}...")
    try:
        connection = pymysql.connect(
            host=args.host,
            port=args.port,
            user=args.user,
            password=get_password(),
            database=args.database,
            charset="utf8mb4",
            cursorclass=SSCursor,
            autocommit=True,
            connect_timeout=20,
            read_timeout=300,
        )
    except pymysql.MySQLError as error:
        print(f"Database connection failed: {error}", file=sys.stderr)
        return 1

    downloaded_at = datetime.now(UTC).isoformat()
    table_manifest: dict[str, dict[str, Any]] = {}
    create_statements: list[str] = []

    try:
        found = available_tables(connection)
        missing = set(EXPECTED_TABLES) - found
        if missing:
            print(f"Expected tables are missing: {', '.join(sorted(missing))}", file=sys.stderr)
            return 1

        for table, destination in zip(EXPECTED_TABLES, destinations, strict=True):
            print(f"Inspecting {table} schema...")
            metadata = source_table_metadata(connection, args.database, table)
            create_statements.append(source_create_statement(connection, table))
            print(f"Exporting {table}...")
            exported_rows = export_table(connection, table, destination)
            if exported_rows != metadata["source_row_count"]:
                raise RuntimeError(
                    f"Row-count mismatch for {table}: source has "
                    f"{metadata['source_row_count']:,}, exported {exported_rows:,}"
                )
            table_manifest[table] = {
                "file": destination.name,
                **metadata,
                "exported_row_count": exported_rows,
                "sha256": sha256(destination),
            }
    except (OSError, RuntimeError, pymysql.MySQLError) as error:
        print(f"Download failed: {error}", file=sys.stderr)
        return 1
    finally:
        connection.close()

    schema = "\n".join(
        [
            "-- CTU Prague Financial (Berka) source schema",
            f"-- Retrieved at {downloaded_at}",
            "SET FOREIGN_KEY_CHECKS=0;",
            "",
            "\n\n".join(create_statements),
            "",
            "SET FOREIGN_KEY_CHECKS=1;",
            "",
        ]
    )
    schema_temporary = schema_path.with_suffix(schema_path.suffix + ".part")
    try:
        schema_temporary.write_text(schema, encoding="utf-8")
        schema_temporary.replace(schema_path)
    except OSError as error:
        schema_temporary.unlink(missing_ok=True)
        print(f"Could not save source schema: {error}", file=sys.stderr)
        return 1

    manifest = {
        "source": "CTU Prague Relational Dataset Repository",
        "dataset": "Financial — PKDD’99 Financial Dataset",
        "url": SOURCE_URL,
        "retrieved_at_utc": downloaded_at,
        "database": args.database,
        "host": args.host,
        "null_marker": NULL_MARKER,
        "schema_file": schema_path.name,
        "schema_sha256": sha256(schema_path),
        "tables": table_manifest,
    }
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"Downloaded {len(table_manifest)} tables to {output_dir}")
    print(f"Provenance manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
