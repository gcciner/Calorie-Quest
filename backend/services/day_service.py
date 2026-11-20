"""Servicio para construir planes diarios, cambiar modos y gestionar overrides."""
from typing import Optional

import daily
import economy
import exercise_planner
import loader
import quests
import render
import schedule
import tracker


def clamp_day(settings: dict, n: Optional[int]) -> int:
    """Devuelve el número de día válido o el día actual si n es None."""
    if n is None:
        return schedule.today_number(settings)
    total = settings["total_days"]
    if n < 1 or n > total:
        raise ValueError(f"Día fuera de rango (1..{total}): {n}")
    return n


def _cleanup_day_override(overrides: dict, day_key: str) -> None:
    ov = overrides.get(day_key)
    if not isinstance(ov, dict):
        overrides.pop(day_key, None)
        return
    if "exercises" in ov and not ov["exercises"]:
        ov.pop("exercises", None)
    if "meals" in ov and not ov["meals"]:
        ov.pop("meals", None)
    if not ov:
        overrides.pop(day_key, None)


def _session_alternatives(ctx, win: dict, mode: str, level: float, current_ex_id: str) -> list:
    mult = ctx.settings["coin_multiplier"]
    eligible = [e for e in ctx.exercises if exercise_planner._eligible(e, win, mode)]
    if not any(e.id == current_ex_id for e in eligible):
        current = next((e for e in ctx.exercises if e.id == current_ex_id), None)
        if current is not None:
            eligible = [current, *eligible]
    alternatives = []
    for ex in eligible:
        s_min, s_coins, s_amt = ex.scaled(level, mult, win["max_min"])
        alternatives.append(
            {
                "id": ex.id,
                "name": ex.name,
                "minutes": ex.minutes,
                "coins": ex.coins,
                "scaled_minutes": s_min,
                "scaled_coins": s_coins,
                "amount": s_amt,
                "kind": ex.kind,
            }
        )
    return alternatives


def _meal_alternatives(ctx, meal) -> list:
    alts = [m for m in ctx.meals if m.slot == meal.slot]
    if not any(m.id == meal.id for m in alts):
        alts = [meal, *alts]
    return [
        {
            "id": m.id,
            "name": m.name,
            "kcal": m.kcal,
            "prep_min": m.prep_min,
            "tier": m.tier,
        }
        for m in alts
    ]


def serialize_day(n: Optional[int] = None) -> dict:
    """Construye la representación completa y JSON-serializable de un día."""
    ctx = loader.load_context()
    prog = tracker.load()
    day_num = clamp_day(ctx.settings, n)
    plan = daily.build_day(ctx, day_num)
    pd = prog.get("days", {}).get(str(day_num), {"done": [], "quest": False, "eaten": {}})
    streak = quests.streak_at(ctx.settings, prog, day_num)
    lg = economy.ledger(ctx.settings, plan, pd, streak)

    done_set = set(pd.get("done", []))
    eaten_map = pd.get("eaten", {})
    ov_day = ctx.overrides.get(str(day_num), {})
    ov_ex = ov_day.get("exercises", {})
    ov_meals = ov_day.get("meals", {})
    win_map = {w["id"]: w for w in ctx.settings["windows"][plan.info["daytype"]]}
    ex_kind_map = {e.id: e.kind for e in ctx.exercises}

    sessions_payload = []
    for x in plan.sessions:
        win = win_map.get(x.window, {"id": x.window, "max_min": 999})
        sessions_payload.append(
            {
                "window": x.window,
                "label": x.label,
                "hint": x.hint,
                "exercise_id": x.exercise_id,
                "name": x.name,
                "how": x.how,
                "kind": ex_kind_map.get(x.exercise_id, "strength"),
                "minutes": x.minutes,
                "coins": x.coins,
                "amount": x.amount,
                "optional": x.optional,
                "completed": x.window in done_set,
                "is_overridden": x.window in ov_ex,
                "alternatives": _session_alternatives(
                    ctx, win, plan.mode, plan.info["level"], x.exercise_id
                ),
            }
        )

    meals_payload = []
    for m in plan.meals:
        eaten_entry = eaten_map.get(m.slot)
        meals_payload.append(
            {
                "id": m.id,
                "name": m.name,
                "slot": m.slot,
                "kcal": m.kcal,
                "prep_min": m.prep_min,
                "tier": m.tier,
                "eaten": eaten_entry is not None,
                "logged_kcal": eaten_entry["kcal"] if eaten_entry else m.kcal,
                "logged_name": eaten_entry["name"] if eaten_entry else m.name,
                "is_overridden": m.slot in ov_meals,
                "alternatives": _meal_alternatives(ctx, m),
            }
        )

    info_serialized = {
        **plan.info,
        "date": plan.info["date"].isoformat(),
    }

    return {
        "n": day_num,
        "today_n": schedule.today_number(ctx.settings),
        "total_days": ctx.settings["total_days"],
        "info": info_serialized,
        "mode": plan.mode,
        "sessions": sessions_payload,
        "meals": meals_payload,
        "quest": {
            "text": plan.quest["text"],
            "bonus": plan.quest["bonus"],
            "completed": bool(pd.get("quest", False)),
        },
        "potential": plan.potential,
        "ledger": lg,
        "streak": streak,
        "combo_target": ctx.settings["combo_bonus"],
        "markdown": render.render_day(plan, ctx.settings, prog, streak),
    }


def set_mode(n: int, mode: str) -> dict:
    """Actualiza el modo de un día (normal, busy o rest) en overrides.json."""
    ctx = loader.load_context()
    day_num = clamp_day(ctx.settings, n)
    info = schedule.day_info(ctx.settings, day_num)
    day_key = str(day_num)
    ov = ctx.overrides.setdefault(day_key, {})

    default_mode = "rest" if info["is_rest"] else "normal"
    if mode == default_mode:
        ov.pop("mode", None)
    else:
        ov["mode"] = mode

    _cleanup_day_override(ctx.overrides, day_key)
    loader.write_json("overrides.json", ctx.overrides)
    return serialize_day(day_num)


def set_exercise_override(n: int, window: str, exercise_id: Optional[str]) -> dict:
    """Fuerza o limpia el ejercicio asignado a una ventana en overrides.json."""
    ctx = loader.load_context()
    day_num = clamp_day(ctx.settings, n)
    info = schedule.day_info(ctx.settings, day_num)
    valid_windows = {w["id"] for w in ctx.settings["windows"][info["daytype"]]}
    if window not in valid_windows:
        raise ValueError(f"Ventana '{window}' no válida para {info['daytype']}")

    day_key = str(day_num)
    if exercise_id:
        if not any(e.id == exercise_id for e in ctx.exercises):
            raise LookupError(f"Ejercicio '{exercise_id}' no encontrado")
        ov = ctx.overrides.setdefault(day_key, {})
        ov.setdefault("exercises", {})[window] = exercise_id
    else:
        ov = ctx.overrides.get(day_key, {})
        ov.get("exercises", {}).pop(window, None)
        _cleanup_day_override(ctx.overrides, day_key)

    loader.write_json("overrides.json", ctx.overrides)
    return serialize_day(day_num)


def set_meal_override(n: int, slot: str, meal_id: Optional[str]) -> dict:
    """Fuerza o limpia la comida asignada a un horario en overrides.json."""
    ctx = loader.load_context()
    day_num = clamp_day(ctx.settings, n)
    info = schedule.day_info(ctx.settings, day_num)
    valid_slots = set(ctx.settings["meal_slots"][info["daytype"]])
    if slot not in valid_slots:
        raise ValueError(f"Horario de comida '{slot}' no válido")

    day_key = str(day_num)
    if meal_id:
        meal = next((m for m in ctx.meals if m.id == meal_id), None)
        if meal is None:
            raise LookupError(f"Comida '{meal_id}' no encontrada")
        if meal.slot != slot:
            raise ValueError(f"La comida '{meal_id}' pertenece al horario '{meal.slot}', no '{slot}'")
        ov = ctx.overrides.setdefault(day_key, {})
        ov.setdefault("meals", {})[slot] = meal_id
    else:
        ov = ctx.overrides.get(day_key, {})
        ov.get("meals", {}).pop(slot, None)
        _cleanup_day_override(ctx.overrides, day_key)

    loader.write_json("overrides.json", ctx.overrides)
    return serialize_day(day_num)
