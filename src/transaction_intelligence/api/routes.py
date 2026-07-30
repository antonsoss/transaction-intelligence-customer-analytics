"""API routes for dashboard-ready analytical outputs."""

from datetime import date

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from transaction_intelligence.api.repository import (
    DashboardDataUnavailable,
    DashboardRepository,
)
from transaction_intelligence.api.schemas import (
    ClusteringEvaluation,
    HealthResponse,
    MonthlyActivity,
    MonthlyTransactionForecast,
    OutlierCase,
    SegmentPoint,
    SegmentProfile,
    ServiceRule,
    SummaryMetric,
    ValidationOverview,
)


def create_dashboard_router(repository: DashboardRepository) -> APIRouter:
    router = APIRouter(tags=["dashboard"])

    def unavailable(error: DashboardDataUnavailable) -> HTTPException:
        return HTTPException(status_code=503, detail=str(error))

    @router.get("/health", response_model=HealthResponse)
    def health() -> dict:
        return repository.health()

    @router.get("/summary", response_model=list[SummaryMetric])
    def summary() -> list[dict]:
        try:
            return repository.summary()
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error

    @router.get("/segments/points", response_model=list[SegmentPoint])
    def segment_points() -> list[dict]:
        try:
            return repository.segment_points()
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error

    @router.get("/segments", response_model=list[SegmentProfile])
    def segments() -> list[dict]:
        try:
            return repository.segments()
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error

    @router.get(
        "/segments/evaluation",
        response_model=list[ClusteringEvaluation],
    )
    def clustering_evaluation() -> list[dict]:
        try:
            return repository.clustering_evaluation()
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error

    @router.get("/segments/{segment_id}", response_model=SegmentProfile)
    def segment(segment_id: int) -> dict:
        try:
            matching = [
                item for item in repository.segments() if item["segment_id"] == segment_id
            ]
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error
        if not matching:
            raise HTTPException(status_code=404, detail="Segment not found")
        return matching[0]

    @router.get("/outliers", response_model=list[OutlierCase])
    def outliers(
        segment_id: int | None = None,
        minimum_signals: int = Query(default=2, ge=2, le=4),
    ) -> list[dict]:
        try:
            return repository.outliers(segment_id, minimum_signals)
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error

    @router.get("/activity", response_model=list[MonthlyActivity])
    def activity(
        start: date | None = None,
        end: date | None = None,
    ) -> list[dict]:
        if start and end and start > end:
            raise HTTPException(status_code=422, detail="start must be before end")
        try:
            return repository.activity(start, end)
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error

    @router.get(
        "/transaction-forecast",
        response_model=list[MonthlyTransactionForecast],
    )
    def transaction_forecast() -> list[dict]:
        try:
            return repository.transaction_forecast()
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error

    @router.get("/service-rules", response_model=list[ServiceRule])
    def service_rules(
        minimum_lift: float = Query(default=1.0, ge=0),
        minimum_confidence: float = Query(default=0.0, ge=0, le=1),
    ) -> list[dict]:
        try:
            return repository.service_rules(minimum_lift, minimum_confidence)
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error

    @router.get("/validation", response_model=ValidationOverview)
    def validation() -> dict:
        try:
            return repository.validation()
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error

    @router.get("/figures/{filename}", response_class=FileResponse)
    def figure(filename: str) -> FileResponse:
        try:
            path = repository.figure_path(filename)
        except ValueError as error:
            raise HTTPException(status_code=404, detail="Figure not found") from error
        except DashboardDataUnavailable as error:
            raise unavailable(error) from error
        return FileResponse(path)

    return router
