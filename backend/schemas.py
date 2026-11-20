"""Esquemas Pydantic v2 para validación de peticiones y respuestas."""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class ModeUpdateRequest(BaseModel):
    mode: Literal["normal", "busy", "rest"]


class ToggleRequest(BaseModel):
    completed: Optional[bool] = None


class ExerciseOverrideRequest(BaseModel):
    exercise_id: Optional[str] = None


class MealLogRequest(BaseModel):
    eaten: bool = True
    kcal: Optional[int] = Field(default=None, ge=0)
    name: Optional[str] = None


class MealOverrideRequest(BaseModel):
    meal_id: Optional[str] = None


class ExerciseCreateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    windows: List[str] = Field(min_length=1)
    minutes: int = Field(gt=0, le=300)
    coins: int = Field(ge=0, le=5000)
    how: str = Field(min_length=1, max_length=400)
    kind: Literal["strength", "walk", "run", "stretch", "game", "bus"] = "strength"
    base: int = Field(default=0, ge=0, le=100000)
    unit: str = Field(default="", max_length=32)


class MealCreateRequest(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    slot: Literal["desayuno", "almuerzo", "merienda", "cena"]
    kcal: int = Field(ge=0, le=5000)
    prep_min: int = Field(default=0, ge=0, le=240)
    tier: Literal["quick", "normal"] = "normal"


class SettingsUpdateRequest(BaseModel):
    start_date: Optional[str] = None
    base_coins: Optional[int] = Field(default=None, ge=0, le=10000)
    coin_multiplier: Optional[float] = Field(default=None, gt=0, le=10.0)
    streak_min_sessions: Optional[int] = Field(default=None, ge=1, le=10)
    rest_days: Optional[List[int]] = None
