"""Orquesta los módulos para construir el plan de un día."""
from models import DayPlan
from schedule import day_info
from exercise_planner import plan_exercises
from meal_planner import plan_meals
from economy import potential_coins
from quests import daily_quest


def build_day(ctx, n):
    s = ctx.settings
    info = day_info(s, n)
    ov = ctx.overrides.get(str(n), {})
    mode = ov.get("mode") or ("rest" if info["is_rest"] else "normal")
    sessions = plan_exercises(info, mode, s, ctx.exercises, ov, n)
    pot = potential_coins(s, sessions)
    meals = plan_meals(info, mode, s, ctx.meals, pot, ov, n)
    return DayPlan(n, info, mode, sessions, meals, daily_quest(s, n), pot)
