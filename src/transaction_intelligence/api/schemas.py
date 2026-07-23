"""Typed API responses used by the Angular dashboard."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


class HealthResponse(ApiModel):
    status: str
    available_datasets: int
    required_datasets: int
    missing_datasets: list[str]


class SummaryMetric(ApiModel):
    section: str
    metric: str
    numeric_value: float
    display_value: str
    note: str


class SegmentProfile(ApiModel):
    segment_id: int
    segment_name: str
    population_size: int
    population_share: float
    median_transactions_per_observed_month: float
    median_average_inflow: float
    median_average_outflow: float
    median_inflow_to_outflow_ratio: float
    median_average_balance: float
    median_balance_std: float
    median_negative_balance_share: float
    median_transaction_diversity: float
    median_service_diversity: float
    rate_has_card: float
    rate_has_loan: float
    rate_has_standing_order: float
    defining_features: str
    transaction_patterns: str
    balance_characteristics: str
    banking_service_usage: str
    possible_business_relevance: str
    limitations: str
    behavioral_outlier_count: int
    behavioral_outlier_rate: float


class SegmentPoint(ApiModel):
    point_id: str
    segment_id: int
    segment_name: str
    pca_component_1: float
    pca_component_2: float


class OutlierCase(ApiModel):
    case_id: str
    segment_id: int
    segment_name: str
    outlier_signal_count: int
    top_robust_deviation_feature: str
    top_robust_feature_value: float
    top_robust_feature_segment_median: float
    centroid_distance_percentile_within_segment: float
    gmm_max_membership_probability: float
    robust_deviation_score: float
    isolation_anomaly_score: float
    composite_outlier_percentile: float
    transactions_per_observed_month: float
    average_inflow: float
    average_outflow: float
    average_balance: float
    negative_balance_share: float
    transaction_diversity: int
    service_diversity: int
    has_card: bool
    has_loan: bool
    has_standing_order: bool


class MonthlyActivity(ApiModel):
    month: datetime
    transaction_count: int
    total_inflow: float
    total_outflow: float
    withdrawal_count: int
    withdrawal_value: float
    active_account_count: int
    net_cash_flow: float
    transactions_per_active_account: float
    withdrawals_per_active_account: float
    inflow_per_active_account: float
    outflow_per_active_account: float


class ServiceRule(ApiModel):
    rule: str
    antecedents: str
    consequents: str
    support: float
    confidence: float
    lift: float
    leverage: float


class ValidationFigure(ApiModel):
    title: str
    description: str
    url: str


class ValidationOverview(ApiModel):
    selected_model: str
    completed_loans: int
    recorded_problem_loans: int
    f1: float
    pr_auc: float
    figures: list[ValidationFigure]
    limitations: list[str]
