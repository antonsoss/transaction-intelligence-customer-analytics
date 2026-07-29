"""DuckDB-backed access to the prepared dashboard datasets."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any, ClassVar

import duckdb

from transaction_intelligence.config import FIGURES_DIR, PROCESSED_DATA_DIR


class DashboardDataUnavailable(FileNotFoundError):
    """Raised when an expected analytical output has not been generated."""


class DashboardRepository:
    """Read curated Parquet outputs without exposing raw tables or arbitrary SQL."""

    required_datasets = (
        "dashboard_summary.parquet",
        "dashboard_segments.parquet",
        "dashboard_outliers.parquet",
        "monthly_banking_activity.parquet",
        "dashboard_segment_points.parquet",
        "service_association_rules.parquet",
    )

    allowed_figures: ClassVar[set[str]] = {
        "cluster_stability_check.png",
        "loan_logistic_confusion_matrix.png",
        "loan_model_comparison.png",
        "loan_outcomes_by_year.png",
        "loan_target_distribution.png",
    }

    def __init__(
        self,
        processed_dir: Path = PROCESSED_DATA_DIR,
        figures_dir: Path = FIGURES_DIR,
    ) -> None:
        self.processed_dir = processed_dir
        self.figures_dir = figures_dir

    @staticmethod
    def _sql_literal(path: Path) -> str:
        return "'" + str(path).replace("'", "''") + "'"

    def dataset_path(self, filename: str) -> Path:
        if filename not in self.required_datasets:
            raise ValueError(f"Unsupported dashboard dataset: {filename}")
        path = self.processed_dir / filename
        if not path.is_file():
            raise DashboardDataUnavailable(
                f"Missing {filename}. Run the project notebooks before starting the dashboard."
            )
        return path

    def figure_path(self, filename: str) -> Path:
        if filename not in self.allowed_figures:
            raise ValueError(f"Unsupported dashboard figure: {filename}")
        path = self.figures_dir / filename
        if not path.is_file():
            raise DashboardDataUnavailable(
                f"Missing {filename}. Run Notebook 4 before starting the dashboard."
            )
        return path

    def health(self) -> dict[str, Any]:
        missing = [
            filename
            for filename in self.required_datasets
            if not (self.processed_dir / filename).is_file()
        ]
        return {
            "status": "ok" if not missing else "degraded",
            "available_datasets": len(self.required_datasets) - len(missing),
            "required_datasets": len(self.required_datasets),
            "missing_datasets": missing,
        }

    def _records(
        self,
        filename: str,
        query: str,
        parameters: tuple[Any, ...] = (),
    ) -> list[dict[str, Any]]:
        path = self.dataset_path(filename)
        rendered_query = query.format(source=f"read_parquet({self._sql_literal(path)})")
        connection = duckdb.connect()
        try:
            frame = connection.execute(rendered_query, parameters).fetchdf()
        finally:
            connection.close()
        return json.loads(frame.to_json(orient="records", date_format="iso"))

    def summary(self) -> list[dict[str, Any]]:
        return self._records(
            "dashboard_summary.parquet",
            "SELECT * FROM {source} ORDER BY section, metric",
        )

    def segments(self) -> list[dict[str, Any]]:
        return self._records(
            "dashboard_segments.parquet",
            """
            SELECT
                segment_id,
                segment_name,
                population_size,
                population_share,
                median_transactions_per_observed_month,
                median_average_inflow,
                median_average_outflow,
                median_inflow_to_outflow_ratio,
                median_average_balance,
                median_balance_std,
                median_negative_balance_share,
                median_transaction_diversity,
                median_service_diversity,
                rate_has_card,
                rate_has_loan,
                rate_has_standing_order,
                defining_features,
                transaction_patterns,
                balance_characteristics,
                banking_service_usage,
                possible_business_relevance,
                limitations,
                behavioral_outlier_count,
                behavioral_outlier_rate
            FROM {source}
            ORDER BY segment_id
            """,
        )

    def segment_points(self) -> list[dict[str, Any]]:
        return self._records(
            "dashboard_segment_points.parquet",
            """
            SELECT
                point_id,
                segment_id,
                segment_name,
                pca_component_1,
                pca_component_2
            FROM {source}
            ORDER BY point_id
            """,
        )

    def outliers(
        self,
        segment_id: int | None = None,
        minimum_signals: int = 2,
    ) -> list[dict[str, Any]]:
        where_parts = ["outlier_signal_count >= ?"]
        parameters: list[Any] = [minimum_signals]
        if segment_id is not None:
            where_parts.append("segment_id = ?")
            parameters.append(segment_id)
        where_clause = " AND ".join(where_parts)
        return self._records(
            "dashboard_outliers.parquet",
            f"""
            SELECT
                case_id,
                segment_id,
                segment_name,
                outlier_signal_count,
                top_robust_deviation_feature,
                top_robust_feature_value,
                top_robust_feature_segment_median,
                centroid_distance_percentile_within_segment,
                gmm_max_membership_probability,
                robust_deviation_score,
                isolation_anomaly_score,
                composite_outlier_percentile,
                transactions_per_observed_month,
                average_inflow,
                average_outflow,
                average_balance,
                negative_balance_share,
                transaction_diversity,
                service_diversity,
                has_card,
                has_loan,
                has_standing_order
            FROM {{source}}
            WHERE {where_clause}
            ORDER BY outlier_signal_count DESC, composite_outlier_percentile DESC
            """,
            tuple(parameters),
        )

    def activity(
        self,
        start: date | None = None,
        end: date | None = None,
    ) -> list[dict[str, Any]]:
        where_parts = ["TRUE"]
        parameters: list[Any] = []
        if start is not None:
            where_parts.append("CAST(month AS DATE) >= ?")
            parameters.append(start)
        if end is not None:
            where_parts.append("CAST(month AS DATE) <= ?")
            parameters.append(end)
        return self._records(
            "monthly_banking_activity.parquet",
            f"""
            SELECT
                month,
                transaction_count,
                total_inflow,
                total_outflow,
                withdrawal_count,
                withdrawal_value,
                active_account_count,
                net_cash_flow,
                transactions_per_active_account,
                withdrawals_per_active_account,
                inflow_per_active_account,
                outflow_per_active_account
            FROM {{source}}
            WHERE {" AND ".join(where_parts)}
            ORDER BY month
            """,
            tuple(parameters),
        )

    def service_rules(
        self,
        minimum_lift: float = 1.0,
        minimum_confidence: float = 0.0,
    ) -> list[dict[str, Any]]:
        return self._records(
            "service_association_rules.parquet",
            """
            SELECT
                rule,
                antecedents,
                consequents,
                support,
                confidence,
                lift,
                leverage
            FROM {source}
            WHERE lift >= ? AND confidence >= ?
            ORDER BY lift DESC, confidence DESC, support DESC
            """,
            (minimum_lift, minimum_confidence),
        )

    def validation(self) -> dict[str, Any]:
        metrics = {row["metric"]: row for row in self.summary()}
        return {
            "selected_model": "Logistic regression",
            "completed_loans": int(metrics["Completed loans"]["numeric_value"]),
            "recorded_problem_loans": int(
                metrics["Recorded problem loans"]["numeric_value"]
            ),
            "f1": float(metrics["Logistic-regression F1"]["numeric_value"]),
            "pr_auc": float(metrics["Logistic-regression PR-AUC"]["numeric_value"]),
            "figures": [
                {
                    "title": "Model comparison",
                    "description": "Held-out results for the four course models.",
                    "url": "/api/v1/figures/loan_model_comparison.png",
                },
                {
                    "title": "Confusion matrix",
                    "description": "Correct predictions, false alarms, and missed problems.",
                    "url": "/api/v1/figures/loan_logistic_confusion_matrix.png",
                },
                {
                    "title": "Outcome coverage by year",
                    "description": "Completed-loan volume and recorded problem rate over time.",
                    "url": "/api/v1/figures/loan_outcomes_by_year.png",
                },
                {
                    "title": "Cluster stability",
                    "description": "Repeatability across random starts and sensitivity to preparation.",
                    "url": "/api/v1/figures/cluster_stability_check.png",
                },
            ],
            "limitations": [
                "The loan test set is small and contains few recorded problem loans.",
                "The data describe Czech banking activity from the 1990s.",
                "The model is a course demonstration, not a lending decision system.",
                "Behavioral outliers are not evidence of fraud or wrongdoing.",
            ],
        }
