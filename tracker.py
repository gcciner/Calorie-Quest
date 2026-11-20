"""Progreso guardado (qué completaste y qué comiste)."""
from loader import read_json, write_json


def load():
    return read_json("progress.json", {"days": {}})


def save(p):
    write_json("progress.json", p)


def day(p, n):
    return p["days"].setdefault(str(n), {"done": [], "quest": False, "eaten": {}})
