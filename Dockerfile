FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

RUN npm install --global pnpm@11.9.0

COPY dashboard/package.json dashboard/pnpm-lock.yaml dashboard/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY dashboard/ ./
RUN pnpm build


FROM python:3.14.6-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

WORKDIR /app

COPY pyproject.toml README.md requirements-api.txt ./
COPY src/ ./src/
RUN pip install --no-cache-dir --requirement requirements-api.txt \
    && pip install --no-cache-dir --no-deps .

COPY data/processed/dashboard_summary.parquet \
     data/processed/dashboard_segments.parquet \
     data/processed/dashboard_outliers.parquet \
     data/processed/dashboard_segment_points.parquet \
     data/processed/monthly_banking_activity.parquet \
     data/processed/service_association_rules.parquet \
     ./data/processed/

COPY reports/figures/cluster_stability_check.png \
     reports/figures/loan_logistic_confusion_matrix.png \
     reports/figures/loan_model_comparison.png \
     reports/figures/loan_outcomes_by_year.png \
     reports/figures/loan_target_distribution.png \
     ./reports/figures/

COPY --from=frontend-builder /frontend/dist/dashboard/browser ./dashboard/dist/dashboard/browser

RUN useradd --create-home appuser
USER appuser

EXPOSE 10000

CMD ["sh", "-c", "uvicorn transaction_intelligence.api.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
