"""Verify that local, notebook, test, and deployment code use one Python runtime."""

import platform


def test_python_runtime_is_3_14_6() -> None:
    assert platform.python_version() == "3.14.6"
