"""Economía de Calorie Coins: ganar con ejercicio, gastar en comida."""


def potential_coins(s, sessions):
    """Monedas que ganarías si completas las sesiones NO opcionales."""
    return s["base_coins"] + sum(x.coins for x in sessions if not x.optional)


def ledger(s, plan, pd, streak):
    done = set(pd.get("done", []))
    done_sessions = [x for x in plan.sessions if x.window in done]
    from_ex = sum(x.coins for x in done_sessions)
    bonus = {}
    if pd.get("quest"):
        bonus["misión del día"] = plan.quest["bonus"]
    cb = s["combo_bonus"]
    if len(done_sessions) >= cb["min_sessions"]:
        bonus["combo"] = cb["coins"]
    if s["streak_bonus"].get(str(streak)):
        bonus[f"racha {streak} días"] = s["streak_bonus"][str(streak)]
    earned = s["base_coins"] + from_ex + sum(bonus.values())
    spent = sum(v["kcal"] for v in pd.get("eaten", {}).values())
    return {"base": s["base_coins"], "exercise": from_ex, "bonus": bonus,
            "earned": earned, "spent": spent, "balance": earned - spent}
