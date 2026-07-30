export interface HealthResponse {
  status: 'ok' | 'degraded';
  available_datasets: number;
  required_datasets: number;
  missing_datasets: string[];
}

export interface SummaryMetric {
  section: string;
  metric: string;
  numeric_value: number;
  display_value: string;
  note: string;
}

export interface MonthlyActivity {
  month: string;
  transaction_count: number;
  total_inflow: number;
  total_outflow: number;
  withdrawal_count: number;
  withdrawal_value: number;
  active_account_count: number;
  net_cash_flow: number;
  transactions_per_active_account: number;
  withdrawals_per_active_account: number;
  inflow_per_active_account: number;
  outflow_per_active_account: number;
}

export interface MonthlyTransactionForecast {
  month: string;
  period: 'training' | 'test';
  observed_transaction_count: number;
  seasonal_naive: number | null;
  sarima_forecast: number | null;
  sarima_lower_95: number | null;
  sarima_upper_95: number | null;
}

export interface ServiceRule {
  rule: string;
  antecedents: string;
  consequents: string;
  support: number;
  confidence: number;
  lift: number;
  leverage: number;
}

export interface SegmentProfile {
  segment_id: number;
  segment_name: string;
  population_size: number;
  population_share: number;
  median_transactions_per_observed_month: number;
  median_average_inflow: number;
  median_average_outflow: number;
  median_inflow_to_outflow_ratio: number;
  median_average_balance: number;
  median_balance_std: number;
  median_negative_balance_share: number;
  median_transaction_diversity: number;
  median_service_diversity: number;
  rate_has_card: number;
  rate_has_loan: number;
  rate_has_standing_order: number;
  defining_features: string;
  transaction_patterns: string;
  balance_characteristics: string;
  banking_service_usage: string;
  possible_business_relevance: string;
  limitations: string;
  behavioral_outlier_count: number;
  behavioral_outlier_rate: number;
}

export interface SegmentPoint {
  point_id: string;
  segment_id: number;
  segment_name: string;
  pca_component_1: number;
  pca_component_2: number;
}

export interface ClusteringEvaluation {
  algorithm: 'K-means' | 'GMM';
  k: number;
  inertia: number | null;
  inertia_reduction_from_previous_k: number | null;
  aic: number | null;
  bic: number | null;
  silhouette: number;
  davies_bouldin: number;
  smallest_group: number;
  largest_group: number;
  smallest_group_share: number;
  is_selected_k: boolean;
  is_selected_solution: boolean;
}

export interface OutlierCase {
  case_id: string;
  segment_id: number;
  segment_name: string;
  outlier_signal_count: number;
  top_robust_deviation_feature: string;
  top_robust_feature_value: number;
  top_robust_feature_segment_median: number;
  centroid_distance_percentile_within_segment: number;
  gmm_max_membership_probability: number;
  robust_deviation_score: number;
  isolation_anomaly_score: number;
  composite_outlier_percentile: number;
  transactions_per_observed_month: number;
  average_inflow: number;
  average_outflow: number;
  average_balance: number;
  negative_balance_share: number;
  transaction_diversity: number;
  service_diversity: number;
  has_card: boolean;
  has_loan: boolean;
  has_standing_order: boolean;
}

export interface ValidationFigure {
  title: string;
  description: string;
  url: string;
}

export interface ValidationOverview {
  selected_model: string;
  completed_loans: number;
  recorded_problem_loans: number;
  f1: number;
  pr_auc: number;
  figures: ValidationFigure[];
  limitations: string[];
}
