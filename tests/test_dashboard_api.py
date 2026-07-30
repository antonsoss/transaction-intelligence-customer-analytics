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
    assert response.json()["required_datasets"] == 8
    assert "dashboard_summary.parquet" in response.json()["missing_datasets"]
    assert "monthly_transaction_forecast.parquet" in response.json()["missing_datasets"]
    assert "clustering_evaluation.parquet" in response.json()["missing_datasets"]


def test_transaction_forecast_returns_chronological_series(tmp_path: Path) -> None:
    write_parquet(
        tmp_path / "monthly_transaction_forecast.parquet",
        """
        SELECT *
        FROM (
            VALUES
                (
                    TIMESTAMP '1997-12-01',
                    'training',
                    28269,
                    NULL::DOUBLE,
                    NULL::DOUBLE,
                    NULL::DOUBLE,
                    NULL::DOUBLE
                ),
                (
                    TIMESTAMP '1998-01-01',
                    'test',
                    42736,
                    32953.0,
                    44765.0,
                    41905.0,
                    47625.0
                )
        ) AS forecast(
            month,
            period,
            observed_transaction_count,
            seasonal_naive,
            sarima_forecast,
            sarima_lower_95,
            sarima_upper_95
        )
        """,
    )
    repository = DashboardRepository(processed_dir=tmp_path, figures_dir=tmp_path)

    response = get(create_app(repository), "/api/v1/transaction-forecast")

    assert response.status_code == 200
    assert response.json() == [
        {
            "month": "1997-12-01T00:00:00",
            "period": "training",
            "observed_transaction_count": 28269,
            "seasonal_naive": None,
            "sarima_forecast": None,
            "sarima_lower_95": None,
            "sarima_upper_95": None,
        },
        {
            "month": "1998-01-01T00:00:00",
            "period": "test",
            "observed_transaction_count": 42736,
            "seasonal_naive": 32953.0,
            "sarima_forecast": 44765.0,
            "sarima_lower_95": 41905.0,
            "sarima_upper_95": 47625.0,
        },
    ]


def test_segment_points_are_read_from_anonymous_dashboard_data(tmp_path: Path) -> None:
    write_parquet(
        tmp_path / "dashboard_segment_points.parquet",
        """
        SELECT
            'Point 0001'::VARCHAR AS point_id,
            2::INTEGER AS segment_id,
            'Established household users'::VARCHAR AS segment_name,
            0.25::DOUBLE AS pca_component_1,
            -1.5::DOUBLE AS pca_component_2
        """,
    )
    repository = DashboardRepository(processed_dir=tmp_path, figures_dir=tmp_path)

    response = get(create_app(repository), "/api/v1/segments/points")

    assert response.status_code == 200
    assert response.json() == [
        {
            "point_id": "Point 0001",
            "segment_id": 2,
            "segment_name": "Established household users",
            "pca_component_1": 0.25,
            "pca_component_2": -1.5,
        }
    ]
    assert "account_id" not in response.text


def test_clustering_evaluation_returns_notebook_model_selection_metrics(
    tmp_path: Path,
) -> None:
    write_parquet(
        tmp_path / "clustering_evaluation.parquet",
        """
        SELECT *
        FROM (
            VALUES
                (
                    'GMM',
                    5,
                    NULL::DOUBLE,
                    NULL::DOUBLE,
                    -5845.363035,
                    -4088.520882,
                    0.156777,
                    2.138954,
                    288,
                    1441,
                    0.064,
                    TRUE,
                    FALSE
                ),
                (
                    'K-means',
                    5,
                    17075.236757,
                    0.155997,
                    NULL::DOUBLE,
                    NULL::DOUBLE,
                    0.304458,
                    1.179629,
                    251,
                    1519,
                    0.055778,
                    TRUE,
                    TRUE
                )
        ) AS evaluation(
            algorithm,
            k,
            inertia,
            inertia_reduction_from_previous_k,
            aic,
            bic,
            silhouette,
            davies_bouldin,
            smallest_group,
            largest_group,
            smallest_group_share,
            is_selected_k,
            is_selected_solution
        )
        """,
    )
    repository = DashboardRepository(processed_dir=tmp_path, figures_dir=tmp_path)

    response = get(create_app(repository), "/api/v1/segments/evaluation")

    assert response.status_code == 200
    rows = response.json()
    assert [row["algorithm"] for row in rows] == ["K-means", "GMM"]
    assert rows[0] == {
        "algorithm": "K-means",
        "k": 5,
        "inertia": 17075.236757,
        "inertia_reduction_from_previous_k": 0.155997,
        "aic": None,
        "bic": None,
        "silhouette": 0.304458,
        "davies_bouldin": 1.179629,
        "smallest_group": 251,
        "largest_group": 1519,
        "smallest_group_share": 0.055778,
        "is_selected_k": True,
        "is_selected_solution": True,
    }
    assert rows[1]["aic"] == -5845.363035
    assert rows[1]["bic"] == -4088.520882
    assert rows[1]["is_selected_solution"] is False


def test_unknown_figure_is_not_served(tmp_path: Path) -> None:
    repository = DashboardRepository(processed_dir=tmp_path, figures_dir=tmp_path)

    response = get(create_app(repository), "/api/v1/figures/private-file.png")

    assert response.status_code == 404
