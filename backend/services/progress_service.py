"""Servicio para registrar progreso diario: sesiones, misiones y comidas."""
from typing import Optional

import daily
import loader
import tracker

from backend.services.day_service import clamp_day, serialize_day


def toggle_session(n: int, window: str, completed: Optional[bool] = None) -> dict:
    """Marca o desmarca una sesión de ejercicio como completada."""
    ctx = loader.load_context()
    day_num = clamp_day(ctx.settings, n)
    plan = daily.build_day(ctx, day_num)
    valid_windows = {x.window for x in plan.sessions}
    if window not in valid_windows:
        raise ValueError(f"Ventana '{window}' no existe en el plan del día {day_num}")

    prog = tracker.load()
    pd = tracker.day(prog, day_num)
    is_done = window in pd["done"]
    target = (not is_done) if completed is None else completed

    if target and not is_done:
        pd["done"].append(window)
    elif not target and is_done:
        pd["done"] = [w for w in pd["done"] if w != window]

    tracker.save(prog)
    return serialize_day(day_num)


def toggle_quest(n: int, completed: Optional[bool] = None) -> dict:
    """Marca o desmarca la misión del día."""
    ctx = loader.load_context()
    day_num = clamp_day(ctx.settings, n)
    prog = tracker.load()
    pd = tracker.day(prog, day_num)

    current = bool(pd.get("quest", False))
    pd["quest"] = (not current) if completed is None else bool(completed)

    tracker.save(prog)
    return serialize_day(day_num)


def log_meal(
    n: int,
    slot: str,
    eaten: bool = True,
    kcal: Optional[int] = None,
    name: Optional[str] = None,
) -> dict:
    """Registra o desmarca una comida consumida (planeada o personalizada)."""
    ctx = loader.load_context()
    day_num = clamp_day(ctx.settings, n)
    plan = daily.build_day(ctx, day_num)
    valid_slots = set(ctx.settings["meal_slots"][plan.info["daytype"]])
    if slot not in valid_slots:
        raise ValueError(f"Horario '{slot}' no existe en el día {day_num}")

    prog = tracker.load()
    pd = tracker.day(prog, day_num)

    if not eaten:
        pd["eaten"].pop(slot, None)
    else:
        planned = next((m for m in plan.meals if m.slot == slot), None)
        default_kcal = planned.kcal if planned else 0
        default_name = planned.name if planned else "libre"
        clean_name = name.strip() if isinstance(name, str) and name.strip() else default_name
        final_kcal = kcal if kcal is not None else default_kcal
        pd["eaten"][slot] = {"kcal": final_kcal, "name": clean_name}

    tracker.save(prog)
    return serialize_day(day_num)


def reset_day(n: int) -> dict:
    """Reinicia el progreso y los overrides de un día específico."""
    ctx = loader.load_context()
    day_num = clamp_day(ctx.settings, n)
    day_key = str(day_num)

    prog = tracker.load()
    prog.get("days", {}).pop(day_key, None)
    tracker.save(prog)

    ctx.overrides.pop(day_key, None)
    loader.write_json("overrides.json", ctx.overrides)
    return serialize_day(day_num)
