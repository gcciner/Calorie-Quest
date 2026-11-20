"""Lectura/escritura de los JSON editables en /data."""
import json
from dataclasses import dataclass
from pathlib import Path
from models import Exercise, Meal

DATA = Path(__file__).parent / "data"


def read_json(name, default=None):
    p = DATA / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def write_json(name, obj):
    (DATA / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


@dataclass
class Context:
    settings: dict
    exercises: list
    meals: list
    overrides: dict


def load_context() -> Context:
    return Context(
        settings=read_json("settings.json"),
        exercises=[Exercise(**e) for e in read_json("exercises.json")],
        meals=[Meal(**m) for m in read_json("meals.json")],
        overrides=read_json("overrides.json", {}),
    )
