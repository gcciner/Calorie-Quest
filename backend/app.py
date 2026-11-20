"""Factory de la aplicación FastAPI y montaje del frontend estático."""
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.routers import catalog, days, overview  # noqa: E402


def create_app() -> FastAPI:
    """Construye e inicializa la aplicación FastAPI modular."""
    app = FastAPI(
        title="Calorie Quest API",
        version="1.0.0",
        description="API REST modularizada sobre el motor de Calorie Quest.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health", tags=["health"])
    def health():
        return {"status": "ok", "app": "Calorie Quest"}

    app.include_router(days.router)
    app.include_router(overview.router)
    app.include_router(catalog.router)

    if FRONTEND_DIR.exists():
        app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

    return app


app = create_app()
