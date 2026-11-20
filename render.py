"""Presentación en texto/Markdown."""
from economy import ledger

ICON = {"normal": "🎮", "busy": "⚡ MODO PROYECTOS", "rest": "🌿 DÍA SUAVE"}


def render_day(plan, s, progress=None, streak=0):
    i = plan.info
    pd = (progress or {"days": {}})["days"].get(str(plan.n), {})
    done = set(pd.get("done", []))
    L = [f"## Día {plan.n} · {i['weekday']} {i['date']} · Semana {i['week']} (x{i['level']}) · {ICON[plan.mode]}",
         "", f"**Misión del día:** {plan.quest['text']} (+{plan.quest['bonus']} 🪙)", "",
         "### 🏋️ Ejercicio (haz lo que puedas, en el orden que quieras)"]
    for x in plan.sessions:
        mark = "✅" if x.window in done else "⬜"
        opt = " _(si hay tiempo)_" if x.optional else ""
        amt = f" — {x.amount}" if x.amount else ""
        L.append(f"- {mark} `{x.window}` **{x.label}** ({x.hint}){opt}: {x.name}{amt} · "
                 f"~{x.minutes} min · **+{x.coins} 🪙**\n    {x.how}")
    L += ["", f"### 🍽️ Comida (presupuesto posible hoy: {plan.potential} 🪙; base gratis {s['base_coins']})"]
    eaten = pd.get("eaten", {})
    for m in plan.meals:
        mark = "✅" if m.slot in eaten else "⬜"
        L.append(f"- {mark} `{m.slot}`: {m.name} · prep {m.prep_min} min · **-{m.kcal} 🪙** ({m.kcal} kcal)")
    if progress is not None:
        lg = ledger(s, plan, pd, streak)
        b = ", ".join(f"{k} +{v}" for k, v in lg["bonus"].items()) or "ninguno"
        L += ["", f"### 💰 Cartera: base {lg['base']} + ejercicio {lg['exercise']} + bonos ({b}) "
                  f"= **{lg['earned']}** ganadas · gastadas **{lg['spent']}** · saldo **{lg['balance']}** 🪙 "
                  f"· racha {streak} 🔥"]
    L.append("")
    return "\n".join(L)
