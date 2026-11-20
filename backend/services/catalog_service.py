"""Servicio CRUD para catálogo de ejercicios, comidas y ajustes generales."""
from datetime import date

import loader


def get_catalog() -> dict:
    """Retorna la configuración y catálogos editables desde data/."""
    return {
        "settings": loader.read_json("settings.json"),
        "exercises": loader.read_json("exercises.json", []),
        "meals": loader.read_json("meals.json", []),
        "overrides": loader.read_json("overrides.json", {}),
    }


def update_settings(patch: dict) -> dict:
    """Actualiza parámetros editables en settings.json."""
    settings = loader.read_json("settings.json")
    if "start_date" in patch and patch["start_date"] is not None:
        date.fromisoformat(patch["start_date"])
        settings["start_date"] = patch["start_date"]
    if "base_coins" in patch and patch["base_coins"] is not None:
        settings["base_coins"] = int(patch["base_coins"])
    if "coin_multiplier" in patch and patch["coin_multiplier"] is not None:
        settings["coin_multiplier"] = float(patch["coin_multiplier"])
    if "streak_min_sessions" in patch and patch["streak_min_sessions"] is not None:
        settings["streak_min_sessions"] = int(patch["streak_min_sessions"])
    if "rest_days" in patch and patch["rest_days"] is not None:
        total = settings["total_days"]
        cleaned = sorted({int(d) for d in patch["rest_days"] if 1 <= int(d) <= total})
        settings["rest_days"] = cleaned

    loader.write_json("settings.json", settings)
    return settings


def upsert_exercise(ex_data: dict) -> list:
    """Crea o actualiza un ejercicio en exercises.json."""
    settings = loader.read_json("settings.json")
    valid_windows = {
        w["id"]
        for day_wins in settings["windows"].values()
        for w in day_wins
    }
    invalid = [w for w in ex_data["windows"] if w not in valid_windows]
    if invalid:
        raise ValueError(f"Ventanas desconocidas: {', '.join(invalid)}")

    exercises = loader.read_json("exercises.json", [])
    clean = {
        "id": ex_data["id"].strip(),
        "name": ex_data["name"].strip(),
        "windows": list(dict.fromkeys(ex_data["windows"])),
        "minutes": int(ex_data["minutes"]),
        "coins": int(ex_data["coins"]),
        "kind": ex_data.get("kind", "strength"),
        "how": ex_data["how"].strip(),
    }
    if ex_data.get("base"):
        clean["base"] = int(ex_data["base"])
    if ex_data.get("unit", "").strip():
        clean["unit"] = ex_data["unit"].strip()

    idx = next((i for i, item in enumerate(exercises) if item["id"] == clean["id"]), None)
    if idx is not None:
        exercises[idx] = clean
    else:
        exercises.append(clean)

    loader.write_json("exercises.json", exercises)
    return exercises


def delete_exercise(ex_id: str) -> list:
    """Elimina un ejercicio por su ID de exercises.json."""
    exercises = loader.read_json("exercises.json", [])
    remaining = [item for item in exercises if item["id"] != ex_id]
    if len(remaining) == len(exercises):
        raise LookupError(f"Ejercicio '{ex_id}' no encontrado")
    loader.write_json("exercises.json", remaining)
    return remaining


def upsert_meal(meal_data: dict) -> list:
    """Crea o actualiza una comida en meals.json."""
    meals = loader.read_json("meals.json", [])
    clean = {
        "id": meal_data["id"].strip(),
        "name": meal_data["name"].strip(),
        "slot": meal_data["slot"],
        "kcal": int(meal_data["kcal"]),
        "prep_min": int(meal_data["prep_min"]),
        "tier": meal_data.get("tier", "normal"),
    }

    idx = next((i for i, item in enumerate(meals) if item["id"] == clean["id"]), None)
    if idx is not None:
        meals[idx] = clean
    else:
        meals.append(clean)

    loader.write_json("meals.json", meals)
    return meals


def delete_meal(meal_id: str) -> list:
    """Elimina una comida por su ID de meals.json."""
    meals = loader.read_json("meals.json", [])
    remaining = [item for item in meals if item["id"] != meal_id]
    if len(remaining) == len(meals):
        raise LookupError(f"Comida '{meal_id}' no encontrada")
    loader.write_json("meals.json", remaining)
    return remaining
