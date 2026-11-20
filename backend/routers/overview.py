"""Router para el resumen de 30 días y exportación Markdown."""
from fastapi import APIRouter

from backend.services import overview_service

router = APIRouter(prefix="/api", tags=["overview"])


@router.get("/overview")
def read_overview():
    return overview_service.get_overview()


@router.get("/export/markdown")
def read_export_markdown(include_progress: bool = False):
    return overview_service.export_plan_markdown(include_progress=include_progress)


@router.post("/export/markdown")
def generate_export_markdown(include_progress: bool = False):
    return overview_service.export_plan_markdown(include_progress=include_progress)
