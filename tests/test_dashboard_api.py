import asyncio
from pathlib import Path

import duckdb
import httpx

from transaction_intelligence.api.main import create_app
from transaction_intelligence.api.repository import DashboardRepository


def get(app, path: str) -> httpx.Response:
    async def request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            return await client.get(path)

    return asyncio.run(request())


def write_parquet(path: Path, query: str) -> None:
    connection = duckdb.connect()
    try:
        escaped = "'" + str(path).replace("'", "''") + "'"
        connection.execute(f"COPY ({query}) TO {escaped} (FORMAT PARQUET)")
    finally:
        connection.close()


def test_summary_endpoint_returns_prepared_metrics(tmp_path: Path) -> None:
    write_parquet(
        tmp_path / "dashboard_summary.parquet",
        """
        SELECT
            'Portfolio'::VARCHAR AS section,
            'Accounts'::VARCHAR AS metric,
            4500.0::DOUBLE AS numeric_value,
            '4,500'::VARCHAR AS display_value,
            'Account-level coverage'::VARCHAR AS note
        """,
    )
    repository = DashboardRepository(processed_dir=tmp_path, figures_dir=tmp_path)

    response = get(create_app(repository), "/api/v1/summary")

    assert response.status_code == 200
    assert response.json() == [
        {
            "section": "Portfolio",
            "metric": "Accounts",
            "numeric_value": 4500.0,
            "display_value": "4,500",
            "note": "Account-level coverage",
        }
    ]


def test_health_reports_missing_outputs_without_exposing_files(tmp_path: Path) -> None:
    repository = DashboardRepository(processed_dir=tmp_path, figures_dir=tmp_path)

    response = get(create_app(repository), "/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert response.json()["available_datasets"] == 0
    assert "dashboard_summary.parquet" in response.json()["missing_datasets"]


def test_unknown_figure_is_not_served(tmp_path: Path) -> None:
    repository = DashboardRepository(processed_dir=tmp_path, figures_dir=tmp_path)

    response = get(create_app(repository), "/api/v1/figures/private-file.png")

    assert response.status_code == 404
