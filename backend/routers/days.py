"""Router para consultas, modos, overrides y progreso diario."""
from fastapi import APIRouter, Body, HTTPException

from backend.schemas import (
    ExerciseOverrideRequest,
    MealLogRequest,
    MealOverrideRequest,
    ModeUpdateRequest,
    ToggleRequest,
)
from backend.services import day_service, progress_service

router = APIRouter(prefix="/api/days", tags=["days"])


def _handle_service_call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/today")
def get_today_plan():
    return _handle_service_call(day_service.serialize_day, None)


@router.get("/{day_num}")
def get_day_plan(day_num: int):
    return _handle_service_call(day_service.serialize_day, day_num)


@router.patch("/{day_num}/mode")
def update_day_mode(day_num: int, req: ModeUpdateRequest):
    return _handle_service_call(day_service.set_mode, day_num, req.mode)


@router.post("/{day_num}/sessions/{window}/toggle")
def toggle_day_session(
    day_num: int,
    window: str,
    req: ToggleRequest = Body(default_factory=ToggleRequest),
):
    return _handle_service_call(progress_service.toggle_session, day_num, window, req.completed)


@router.put("/{day_num}/sessions/{window}/override")
def override_day_exercise(day_num: int, window: str, req: ExerciseOverrideRequest):
    return _handle_service_call(day_service.set_exercise_override, day_num, window, req.exercise_id)


@router.post("/{day_num}/quest/toggle")
def toggle_day_quest(
    day_num: int,
    req: ToggleRequest = Body(default_factory=ToggleRequest),
):
    return _handle_service_call(progress_service.toggle_quest, day_num, req.completed)


@router.post("/{day_num}/meals/{slot}")
def log_day_meal(day_num: int, slot: str, req: MealLogRequest):
    return _handle_service_call(
        progress_service.log_meal, day_num, slot, req.eaten, req.kcal, req.name
    )


@router.put("/{day_num}/meals/{slot}/override")
def override_day_meal(day_num: int, slot: str, req: MealOverrideRequest):
    return _handle_service_call(day_service.set_meal_override, day_num, slot, req.meal_id)


@router.delete("/{day_num}/progress")
def reset_day_progress(day_num: int):
    return _handle_service_call(progress_service.reset_day, day_num)
