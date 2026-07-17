from transaction_intelligence.config import DATA_DIR, PROJECT_ROOT


def test_data_directory_is_inside_project() -> None:
    assert DATA_DIR == PROJECT_ROOT / "data"

