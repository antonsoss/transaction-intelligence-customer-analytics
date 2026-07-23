"""FastAPI entry point for the Angular analytics dashboard."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI

from transaction_intelligence.api.repository import DashboardRepository
from transaction_intelligence.api.routes import create_dashboard_router
from transaction_intelligence.config import PROJECT_ROOT


def frontend_directory() -> Path:
    configured = os.getenv("TRANSACTION_INTELLIGENCE_FRONTEND_DIST")
    if configured:
        return Path(configured).expanduser().resolve()
    return PROJECT_ROOT / "dashboard" / "dist" / "dashboard" / "browser"


def create_app(repository: DashboardRepository | None = None) -> FastAPI:
    application = FastAPI(
        title="Transaction Intelligence API",
        description=(
            "Read-only access to the prepared analytical outputs used by the "
            "Transaction Intelligence dashboard."
        ),
        version="1.0.0",
    )
    application.include_router(
        create_dashboard_router(repository or DashboardRepository()),
        prefix="/api/v1",
    )

    frontend_dist = frontend_directory()
    if frontend_dist.is_dir():
        application.frontend(
            "/",
            directory=str(frontend_dist),
            fallback="index.html",
        )
    else:
        @application.get("/", include_in_schema=False)
        def frontend_not_built() -> dict[str, str]:
            return {
                "message": "The Angular dashboard has not been built yet.",
                "api_documentation": "/docs",
            }

    return application


app = create_app()
