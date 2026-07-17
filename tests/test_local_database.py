import unittest

import duckdb

from scripts.build_local_database import (
    create_table_sql,
    table_order,
    validate_relationships,
)


TABLES = {
    "parent": {
        "columns": [
            {
                "name": "parent_id",
                "data_type": "int",
                "column_type": "int(11)",
                "nullable": False,
            }
        ],
        "primary_key": ["parent_id"],
        "foreign_keys": [],
    },
    "child": {
        "columns": [
            {
                "name": "child_id",
                "data_type": "int",
                "column_type": "int(11)",
                "nullable": False,
            },
            {
                "name": "parent_id",
                "data_type": "int",
                "column_type": "int(11)",
                "nullable": False,
            },
        ],
        "primary_key": ["child_id"],
        "foreign_keys": [
            {
                "constraint": "child_parent_fk",
                "column": "parent_id",
                "ordinal_position": 1,
                "referenced_table": "parent",
                "referenced_column": "parent_id",
            }
        ],
    },
}


class LocalDatabaseTest(unittest.TestCase):
    def test_relationships_are_reconstructed_and_enforced(self) -> None:
        self.assertEqual(table_order(TABLES), ["parent", "child"])

        connection = duckdb.connect(":memory:")
        try:
            for table in table_order(TABLES):
                connection.execute(create_table_sql(table, TABLES[table]))

            connection.execute('INSERT INTO "parent" VALUES (1)')
            connection.execute('INSERT INTO "child" VALUES (10, 1)')

            relationships = validate_relationships(connection, TABLES)
            self.assertEqual(len(relationships), 1)
            self.assertTrue(relationships[0]["valid"])
            self.assertEqual(relationships[0]["orphan_count"], 0)

            with self.assertRaises(duckdb.ConstraintException):
                connection.execute('INSERT INTO "child" VALUES (11, 999)')
        finally:
            connection.close()


if __name__ == "__main__":
    unittest.main()

