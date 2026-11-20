"""Router para leer y editar el catálogo (ejercicios, comidas, ajustes)."""
from fastapi import APIRouter, HTTPException

from backend.schemas import (
    ExerciseCreateRequest,
    MealCreateRequest,
    SettingsUpdateRequest,
)
from backend.services import catalog_service

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("")
@router.get("/")
def read_catalog():
    return catalog_service.get_catalog()


@router.patch("/settings")
def patch_settings(req: SettingsUpdateRequest):
    try:
        return {"settings": catalog_service.update_settings(req.model_dump(exclude_none=True))}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/exercises")
def save_exercise(req: ExerciseCreateRequest):
    try:
        return {"exercises": catalog_service.upsert_exercise(req.model_dump())}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/exercises/{exercise_id}")
def remove_exercise(exercise_id: str):
    try:
        return {"exercises": catalog_service.delete_exercise(exercise_id)}
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/meals")
def save_meal(req: MealCreateRequest):
    try:
        return {"meals": catalog_service.upsert_meal(req.model_dump())}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/meals/{meal_id}")
def remove_meal(meal_id: str):
    try:
        return {"meals": catalog_service.delete_meal(meal_id)}
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
