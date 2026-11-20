"""Estructuras de datos (sin lógica de juego)."""
from dataclasses import dataclass, field
from typing import List


@dataclass
class Exercise:
    id: str
    name: str
    windows: List[str]          # ventanas donde puede aparecer
    minutes: int
    coins: int
    how: str
    kind: str = "strength"      # strength | walk | run | stretch | game | bus
    base: int = 0               # cantidad base (reps, seg, min, pasos)
    unit: str = ""              # "reps", "seg", "min", "pasos"...

    def scaled(self, level: float, mult: float = 1.0, cap_min: int = 999):
        """Aplica el nivel de la semana. Devuelve (minutos, monedas, texto)."""
        amount = round(self.base * level) if self.base else 0
        if self.unit == "min":
            amount = min(amount, cap_min)
            minutes = amount
            coins = self.coins * minutes / self.minutes
        else:
            minutes = self.minutes
            coins = self.coins * (1 + (level - 1) / 2)
        text = f"{amount} {self.unit}".strip() if amount else ""
        return minutes, round(coins * mult), text


@dataclass
class Meal:
    id: str
    name: str
    slot: str                   # desayuno | almuerzo | merienda | cena
    kcal: int                   # = costo en Calorie Coins
    prep_min: int
    tier: str = "normal"        # quick (día de proyectos) | normal


@dataclass
class Session:
    window: str
    label: str
    hint: str
    exercise_id: str
    name: str
    how: str
    minutes: int
    coins: int
    amount: str
    optional: bool = False


@dataclass
class DayPlan:
    n: int
    info: dict
    mode: str
    sessions: List[Session] = field(default_factory=list)
    meals: list = field(default_factory=list)
    quest: dict = field(default_factory=dict)
    potential: int = 0
