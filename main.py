"""CLI de Calorie Quest.
Ejemplos:
  python main.py plan            # plan de hoy
  python main.py plan 5          # plan del día 5
  python main.py done 5 lunch night   # marcar sesiones hechas (por ventana)
  python main.py quest 5         # misión del día cumplida
  python main.py ate 5 almuerzo  # comí lo planeado (o: --kcal 600 --name "menú")
  python main.py busy 5          # activar modo proyectos (plan mínimo) ; 'normal 5' lo quita
  python main.py status          # resumen de los 30 días
  python main.py export          # genera plan_30_dias.md
"""
import argparse
from pathlib import Path
from loader import load_context, write_json
from daily import build_day
from schedule import today_number
from quests import streak_at
from economy import ledger
from render import render_day
import tracker


def num(ctx, v):
    return today_number(ctx.settings) if v in (None, "today") else int(v)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    for c in ("plan", "quest", "busy", "normal", "rest"):
        sub.add_parser(c).add_argument("n", nargs="?")
    d = sub.add_parser("done"); d.add_argument("n"); d.add_argument("windows", nargs="+")
    a = sub.add_parser("ate"); a.add_argument("n"); a.add_argument("slot")
    a.add_argument("--kcal", type=int); a.add_argument("--name")
    sub.add_parser("status"); sub.add_parser("export")
    args = ap.parse_args()

    ctx = load_context(); s = ctx.settings; prog = tracker.load()

    if args.cmd in ("busy", "normal", "rest"):
        n = num(ctx, args.n)
        ov = ctx.overrides.setdefault(str(n), {})
        if args.cmd == "normal": ov.pop("mode", None)
        else: ov["mode"] = args.cmd
        write_json("overrides.json", ctx.overrides); ctx = load_context()

    if args.cmd in ("done", "quest", "ate"):
        n = int(args.n) if args.cmd != "quest" else num(ctx, args.n)
        pd = tracker.day(prog, n); plan = build_day(ctx, n)
        if args.cmd == "done":
            valid = {x.window for x in plan.sessions}
            for w in args.windows:
                if w in valid and w not in pd["done"]: pd["done"].append(w)
                elif w not in valid: print(f"Ventana '{w}' no existe hoy. Válidas: {sorted(valid)}")
        elif args.cmd == "quest": pd["quest"] = True
        else:
            m = next((m for m in plan.meals if m.slot == args.slot), None)
            kcal = args.kcal or (m.kcal if m else 0)
            pd["eaten"][args.slot] = {"kcal": kcal, "name": args.name or (m.name if m else "libre")}
        tracker.save(prog)
        args.n = n

    if args.cmd in ("plan", "done", "quest", "ate", "busy", "normal", "rest"):
        n = num(ctx, args.n); plan = build_day(ctx, n)
        print(render_day(plan, s, prog, streak_at(s, prog, n)))
    elif args.cmd == "status":
        total = 0
        for n in range(1, s["total_days"] + 1):
            plan = build_day(ctx, n); st = streak_at(s, prog, n)
            lg = ledger(s, plan, prog["days"].get(str(n), {}), st)
            total += lg["exercise"]
            print(f"Día {n:2d} {plan.info['weekday'][:3]} [{plan.mode:6}] hechas "
                  f"{len(prog['days'].get(str(n), {}).get('done', []))}/{len(plan.sessions)} "
                  f"saldo {lg['balance']:5d} racha {st}")
        print(f"Monedas por ejercicio en total: {total}")
    elif args.cmd == "export":
        out = ["# Calorie Quest · 30 días\n"]
        for n in range(1, s["total_days"] + 1):
            out.append(render_day(build_day(ctx, n), s))
        Path("plan_30_dias.md").write_text("\n".join(out), encoding="utf-8")
        print("Generado plan_30_dias.md")


if __name__ == "__main__":
    main()
