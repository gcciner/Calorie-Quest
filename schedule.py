"""Calendario: tipo de día (lun-vie / sábado / domingo), nivel semanal, descanso."""
from datetime import date, timedelta

DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]


def day_info(s: dict, n: int) -> dict:
    d = date.fromisoformat(s["start_date"]) + timedelta(days=n - 1)
    wd = d.weekday()
    daytype = "weekday" if wd < 5 else ("saturday" if wd == 5 else "sunday")
    steps = s["level_steps"]
    week = (n - 1) // 7
    return {
        "date": d, "weekday": DIAS[wd], "daytype": daytype,
        "week": week + 1, "level": steps[min(week, len(steps) - 1)],
        "is_rest": n in s["rest_days"],
    }


def today_number(s: dict) -> int:
    n = (date.today() - date.fromisoformat(s["start_date"])).days + 1
    return max(1, min(n, s["total_days"]))
