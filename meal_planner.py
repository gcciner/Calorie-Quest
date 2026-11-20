"""Plan de comida del día, ajustado al presupuesto de monedas."""


def plan_meals(info, mode, s, meals, potential, ov, n):
    slots = s["meal_slots"][info["daytype"]]
    forced = ov.get("meals", {})
    pools, chosen = {}, []
    for i, slot in enumerate(slots):
        pool = sorted([m for m in meals if m.slot == slot], key=lambda m: m.id)
        if mode == "busy":
            pool = [m for m in pool if m.tier == "quick"] or pool
        pools[slot] = pool
        pick = next((m for m in meals if m.id == forced.get(slot)), None)
        chosen.append(pick or pool[(n + i) % len(pool)])
    # Ajuste: si el día cuesta más que lo que puedes ganar, abarata el más caro
    while sum(m.kcal for m in chosen) > potential:
        idx = max(range(len(chosen)), key=lambda k: chosen[k].kcal)
        cheaper = [m for m in pools[chosen[idx].slot] if m.kcal < chosen[idx].kcal]
        if not cheaper:
            break
        chosen[idx] = max(cheaper, key=lambda m: m.kcal)
    return chosen
