"""Gamificación: misión diaria y rachas."""


def daily_quest(s, n):
    q = s["quests"]
    return q[(n - 1) % len(q)]


def streak_at(s, progress, n):
    """Días consecutivos (terminando en n) con >= streak_min_sessions completadas."""
    streak = 0
    for k in range(n, 0, -1):
        done = progress["days"].get(str(k), {}).get("done", [])
        if len(done) >= s["streak_min_sessions"]:
            streak += 1
        else:
            break
    return streak
