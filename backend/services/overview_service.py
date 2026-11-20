"""Servicio de resumen global de 30 días, métricas semanales y exportación."""
from collections import defaultdict
from pathlib import Path

import daily
import economy
import loader
import quests
import render
import schedule
import tracker

ROOT_DIR = Path(__file__).resolve().parents[2]


def get_overview() -> dict:
    """Devuelve el mapa completo de los 30 días, KPIs globales y resumen semanal."""
    ctx = loader.load_context()
    s = ctx.settings
    prog = tracker.load()
    today_n = schedule.today_number(s)

    days = []
    week_buckets = defaultdict(list)

    for n in range(1, s["total_days"] + 1):
        plan = daily.build_day(ctx, n)
        pd = prog.get("days", {}).get(str(n), {})
        st = quests.streak_at(s, prog, n)
        lg = economy.ledger(s, plan, pd, st)

        done_count = len(pd.get("done", []))
        req_sessions = sum(1 for x in plan.sessions if not x.optional)
        quest_done = bool(pd.get("quest", False))
        meals_eaten_count = len(pd.get("eaten", {}))
        has_activity = bool(done_count or quest_done or meals_eaten_count)

        entry = {
            "n": n,
            "date": plan.info["date"].isoformat(),
            "weekday": plan.info["weekday"],
            "daytype": plan.info["daytype"],
            "week": plan.info["week"],
            "level": plan.info["level"],
            "mode": plan.mode,
            "is_rest": plan.info["is_rest"],
            "done_count": done_count,
            "required_sessions": req_sessions,
            "total_sessions": len(plan.sessions),
            "quest_done": quest_done,
            "meals_eaten_count": meals_eaten_count,
            "total_meals": len(plan.meals),
            "potential": plan.potential,
            "ledger": lg,
            "streak": st,
            "has_activity": has_activity,
        }
        days.append(entry)
        week_buckets[plan.info["week"]].append(entry)

    active_days = [d for d in days if d["has_activity"]]
    today_entry = days[today_n - 1]
    prev_streak = days[today_n - 2]["streak"] if today_n > 1 else 0
    current_streak = (
        today_entry["streak"]
        if today_entry["done_count"] >= s["streak_min_sessions"]
        else prev_streak
    )

    summary = {
        "today_n": today_n,
        "total_days": s["total_days"],
        "current_streak": current_streak,
        "best_streak": max((d["streak"] for d in days), default=0),
        "total_exercise_coins": sum(d["ledger"]["exercise"] for d in days),
        "total_bonus_coins": sum(sum(d["ledger"]["bonus"].values()) for d in days),
        "total_earned_coins": sum(d["ledger"]["earned"] for d in active_days),
        "total_spent_kcal": sum(d["ledger"]["spent"] for d in days),
        "cumulative_balance": sum(d["ledger"]["balance"] for d in active_days),
        "total_sessions_done": sum(d["done_count"] for d in days),
        "total_required_sessions": sum(d["required_sessions"] for d in days),
        "total_quests_done": sum(1 for d in days if d["quest_done"]),
        "active_days_count": len(active_days),
    }

    weeks = []
    for week_num in sorted(week_buckets.keys()):
        w_days = week_buckets[week_num]
        weeks.append(
            {
                "week": week_num,
                "level": w_days[0]["level"],
                "days_count": len(w_days),
                "active_days": sum(1 for d in w_days if d["has_activity"]),
                "sessions_done": sum(d["done_count"] for d in w_days),
                "required_sessions": sum(d["required_sessions"] for d in w_days),
                "exercise_coins": sum(d["ledger"]["exercise"] for d in w_days),
                "bonus_coins": sum(sum(d["ledger"]["bonus"].values()) for d in w_days),
                "spent_kcal": sum(d["ledger"]["spent"] for d in w_days),
                "quests_done": sum(1 for d in w_days if d["quest_done"]),
            }
        )

    return {"summary": summary, "days": days, "weeks": weeks}


def export_plan_markdown(include_progress: bool = False) -> dict:
    """Genera y guarda plan_30_dias.md y devuelve su contenido."""
    ctx = loader.load_context()
    s = ctx.settings
    prog = tracker.load() if include_progress else None

    out = ["# Calorie Quest · 30 días\n"]
    for n in range(1, s["total_days"] + 1):
        plan = daily.build_day(ctx, n)
        if prog is not None:
            st = quests.streak_at(s, prog, n)
            out.append(render.render_day(plan, s, prog, st))
        else:
            out.append(render.render_day(plan, s))

    content = "\n".join(out)
    target = ROOT_DIR / "plan_30_dias.md"
    target.write_text(content, encoding="utf-8")
    return {"filename": "plan_30_dias.md", "content": content}
