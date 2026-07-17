# Analytical workflow

Project notebooks:

1. `01_data_foundation_and_engineering.ipynb` — framing, preparation, relational engineering, and architecture
2. `02_behavioral_and_temporal_analysis.ipynb` — EDA, behavioral features, time series, and service patterns
3. `03_customer_segmentation.ipynb` — dimensionality reduction, clustering, and outliers
4. `04_validation_and_insights.ipynb` — supervised case study, data-centric evaluation, and synthesis

Keep reusable data preparation and modelling logic in `src/`; notebooks should
orchestrate the analysis and communicate results.
