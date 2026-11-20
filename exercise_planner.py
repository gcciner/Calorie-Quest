"""Plan de ejercicio del día: sesiones modulares ligadas a 'ventanas' flexibles."""
from models import Session


def _eligible(ex, win, mode):
    if win["id"] not in ex.windows:
        return False
    return not (mode == "rest" and ex.kind not in ("stretch", "walk"))


def plan_exercises(info, mode, s, exercises, ov, n):
    wins = sorted(s["windows"][info["daytype"]], key=lambda w: w["priority"])
    mx = s["max_sessions"][mode if mode in ("busy", "rest") else "normal"]
    extras = [] if mode == "busy" else wins[mx:mx + s["max_extras"]]
    forced = ov.get("exercises", {})          # {ventana: id_ejercicio}
    sessions, used = [], set()
    for i, w in enumerate(wins[:mx] + extras):
        pool = [e for e in exercises if _eligible(e, w, mode) and e.id not in used]
        ex = next((e for e in exercises if e.id == forced.get(w["id"])), None)
        if not ex:
            if not pool:
                continue
            if mode == "busy":                 # lo más corto posible
                ex = sorted(pool, key=lambda e: (e.minutes, e.id))[0]
            else:                              # rotación determinista
                ex = pool[(n * 3 + i) % len(pool)]
        used.add(ex.id)
        minutes, coins, amount = ex.scaled(info["level"], s["coin_multiplier"], w["max_min"])
        sessions.append(Session(w["id"], w["label"], w["hint"], ex.id, ex.name, ex.how,
                                minutes, coins, amount, optional=i >= mx))
    return sessions
