"""Pruebas unitarias e integrales del backend REST modularizado de Calorie Quest."""
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"

import loader  # noqa: E402
from backend.routers import catalog, days, overview  # noqa: E402
from backend.schemas import (  # noqa: E402
    ExerciseCreateRequest,
    ExerciseOverrideRequest,
    MealCreateRequest,
    MealLogRequest,
    MealOverrideRequest,
    ModeUpdateRequest,
    SettingsUpdateRequest,
    ToggleRequest,
)
from backend.services import catalog_service, day_service, overview_service, progress_service  # noqa: E402


class CalorieQuestBackendTests(unittest.TestCase):
    def setUp(self):
        self._tracked_files = [
            DATA_DIR / "progress.json",
            DATA_DIR / "overrides.json",
            DATA_DIR / "settings.json",
            DATA_DIR / "exercises.json",
            DATA_DIR / "meals.json",
            ROOT_DIR / "plan_30_dias.md",
        ]
        self._backups = {
            p: p.read_bytes() if p.exists() else None
            for p in self._tracked_files
        }
        (DATA_DIR / "progress.json").write_text('{"days": {}}', encoding="utf-8")
        (DATA_DIR / "overrides.json").write_text("{}", encoding="utf-8")

    def tearDown(self):
        for path, raw in self._backups.items():
            if raw is None:
                if path.exists():
                    path.unlink()
            else:
                path.write_bytes(raw)

    def test_day_plan_modes_and_validation(self):
        today_data = days.get_today_plan()
        self.assertGreaterEqual(today_data["n"], 1)

        d1 = days.get_day_plan(1)
        self.assertEqual(d1["n"], 1)
        self.assertEqual(d1["mode"], "normal")
        self.assertGreater(len(d1["sessions"]), 0)
        self.assertEqual(len(d1["meals"]), 4)

        # Invalid day raises 400
        from fastapi import HTTPException
        with self.assertRaises(HTTPException):
            days.get_day_plan(999)

        # Mode updates
        busy = days.update_day_mode(1, ModeUpdateRequest(mode="busy"))
        self.assertEqual(busy["mode"], "busy")
        self.assertLessEqual(len(busy["sessions"]), 2)

        rest = days.update_day_mode(1, ModeUpdateRequest(mode="rest"))
        self.assertEqual(rest["mode"], "rest")

        norm = days.update_day_mode(1, ModeUpdateRequest(mode="normal"))
        self.assertEqual(norm["mode"], "normal")

        # Day 7 defaults to rest, should allow forcing normal
        d7 = days.update_day_mode(7, ModeUpdateRequest(mode="normal"))
        self.assertEqual(d7["mode"], "normal")

    def test_sessions_quest_meals_overrides_and_reset(self):
        d1 = days.get_day_plan(1)
        first_three_windows = [s["window"] for s in d1["sessions"][:3]]

        for w in first_three_windows:
            d1 = days.toggle_day_session(1, w, ToggleRequest(completed=True))

        self.assertIn("combo", d1["ledger"]["bonus"])
        self.assertEqual(d1["streak"], 1)

        # Quest toggle
        q_res = days.toggle_day_quest(1, ToggleRequest(completed=True))
        self.assertTrue(q_res["quest"]["completed"])
        self.assertIn("misión del día", q_res["ledger"]["bonus"])

        # Exercise override & clear
        target_win = d1["sessions"][0]["window"]
        alt_id = d1["sessions"][0]["alternatives"][-1]["id"]
        ov_res = days.override_day_exercise(
            1, target_win, ExerciseOverrideRequest(exercise_id=alt_id)
        )
        self.assertEqual(ov_res["sessions"][0]["exercise_id"], alt_id)
        self.assertTrue(ov_res["sessions"][0]["is_overridden"])

        clr_res = days.override_day_exercise(
            1, target_win, ExerciseOverrideRequest(exercise_id=None)
        )
        self.assertFalse(clr_res["sessions"][0]["is_overridden"])

        # Meals logging
        m1 = days.log_day_meal(1, "almuerzo", MealLogRequest(eaten=True))
        self.assertGreater(m1["ledger"]["spent"], 0)

        m2 = days.log_day_meal(
            1, "cena", MealLogRequest(eaten=True, kcal=480, name="Ceviche casero")
        )
        cena = next(m for m in m2["meals"] if m["slot"] == "cena")
        self.assertEqual(cena["logged_name"], "Ceviche casero")
        self.assertEqual(cena["logged_kcal"], 480)

        # Reset day
        rst = days.reset_day_progress(1)
        self.assertEqual(rst["ledger"]["spent"], 0)
        self.assertEqual(rst["ledger"]["exercise"], 0)
        self.assertFalse(rst["quest"]["completed"])

    def test_overview_export_and_catalog_crud(self):
        days.toggle_day_quest(1, ToggleRequest(completed=True))

        ov = overview.read_overview()
        self.assertEqual(len(ov["days"]), 30)
        self.assertGreaterEqual(len(ov["weeks"]), 4)
        self.assertEqual(ov["summary"]["total_quests_done"], 1)

        exp = overview.generate_export_markdown(include_progress=True)
        self.assertEqual(exp["filename"], "plan_30_dias.md")
        self.assertIn("# Calorie Quest · 30 días", exp["content"])

        cat = catalog.read_catalog()
        self.assertIn("settings", cat)

        s_res = catalog.patch_settings(SettingsUpdateRequest(base_coins=920))
        self.assertEqual(s_res["settings"]["base_coins"], 920)

        new_ex = ExerciseCreateRequest(
            id="test_rope",
            name="Cuerda prueba",
            windows=["wake", "night"],
            minutes=5,
            coins=65,
            how="Salta 5 min.",
            kind="run",
            base=5,
            unit="min",
        )
        ex_res = catalog.save_exercise(new_ex)
        self.assertTrue(any(e["id"] == "test_rope" for e in ex_res["exercises"]))

        del_res = catalog.remove_exercise("test_rope")
        self.assertFalse(any(e["id"] == "test_rope" for e in del_res["exercises"]))

        new_meal = MealCreateRequest(
            id="test_meal",
            name="Ensalada Test",
            slot="almuerzo",
            kcal=420,
            prep_min=5,
            tier="quick",
        )
        m_res = catalog.save_meal(new_meal)
        self.assertTrue(any(m["id"] == "test_meal" for m in m_res["meals"]))

        m_del = catalog.remove_meal("test_meal")
        self.assertFalse(any(m["id"] == "test_meal" for m in m_del["meals"]))


if __name__ == "__main__":
    unittest.main()
