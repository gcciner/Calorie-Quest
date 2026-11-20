/**
 * Motor de juego en el cliente (JavaScript) para Calorie Quest.
 * Permite que la aplicación funcione 100% en GitHub Pages y modo offline (sin servidor Python),
 * manteniendo sincronización exacta con las reglas de negocio originales.
 */

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const STORAGE_KEYS = {
  progress: "calorie_quest_progress",
  overrides: "calorie_quest_overrides",
  settings: "calorie_quest_settings",
  exercises: "calorie_quest_exercises",
  meals: "calorie_quest_meals",
};

let cachedCatalog = null;

async function fetchJsonFile(path) {
  const attempts = [path, `./${path}`, `../${path}`];
  for (const p of attempts) {
    try {
      const res = await fetch(p);
      if (res.ok) return await res.json();
    } catch (_) {}
  }
  throw new Error(`No se pudo cargar ${path}`);
}

export async function initClientEngine() {
  if (cachedCatalog) return cachedCatalog;

  const storedSettings = localStorage.getItem(STORAGE_KEYS.settings);
  const storedExercises = localStorage.getItem(STORAGE_KEYS.exercises);
  const storedMeals = localStorage.getItem(STORAGE_KEYS.meals);

  const [settings, exercises, meals] = await Promise.all([
    storedSettings ? JSON.parse(storedSettings) : fetchJsonFile("data/settings.json"),
    storedExercises ? JSON.parse(storedExercises) : fetchJsonFile("data/exercises.json"),
    storedMeals ? JSON.parse(storedMeals) : fetchJsonFile("data/meals.json"),
  ]);

  cachedCatalog = { settings, exercises, meals };
  return cachedCatalog;
}

function getProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress);
    return raw ? JSON.parse(raw) : { days: {} };
  } catch (_) {
    return { days: {} };
  }
}

function saveProgress(prog) {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(prog));
}

function getOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.overrides);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function saveOverrides(ov) {
  localStorage.setItem(STORAGE_KEYS.overrides, JSON.stringify(ov));
}

function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dayInfo(settings, n) {
  const start = parseDate(settings.start_date);
  const d = new Date(start.getTime() + (n - 1) * 86400000);
  const isoDate = d.toISOString().split("T")[0];
  const pyWd = (d.getUTCDay() + 6) % 7; // Lunes = 0, Domingo = 6
  const daytype = pyWd < 5 ? "weekday" : pyWd === 5 ? "saturday" : "sunday";
  const steps = settings.level_steps;
  const week = Math.floor((n - 1) / 7);
  const level = steps[Math.min(week, steps.length - 1)];
  const is_rest = (settings.rest_days || []).includes(n);

  return {
    date: isoDate,
    weekday: DIAS[pyWd],
    daytype,
    week: week + 1,
    level,
    is_rest,
  };
}

export function todayNumber(settings) {
  const start = parseDate(settings.start_date);
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const diffDays = Math.floor((utcNow - start) / 86400000) + 1;
  return Math.max(1, Math.min(diffDays, settings.total_days));
}

function isEligible(ex, win, mode) {
  if (!ex.windows.includes(win.id)) return false;
  return !(mode === "rest" && ex.kind !== "stretch" && ex.kind !== "walk");
}

function scaleExercise(ex, level, mult, capMin = 999) {
  const amount = ex.base ? Math.round(ex.base * level) : 0;
  let minutes, coins;
  if (ex.unit === "min") {
    const capped = Math.min(amount, capMin);
    minutes = capped;
    coins = (ex.coins * minutes) / ex.minutes;
  } else {
    minutes = ex.minutes;
    coins = ex.coins * (1 + (level - 1) / 2);
  }
  const text = amount ? `${amount} ${ex.unit || ""}`.trim() : "";
  return {
    minutes,
    coins: Math.round(coins * mult),
    amount: text,
  };
}

export function planExercises(info, mode, settings, exercises, ov, n) {
  const wins = [...settings.windows[info.daytype]].sort((a, b) => a.priority - b.priority);
  const mx = settings.max_sessions[mode === "busy" || mode === "rest" ? mode : "normal"] || 4;
  const extras = mode === "busy" ? [] : wins.slice(mx, mx + settings.max_extras);
  const forced = ov.exercises || {};
  const sessions = [];
  const used = new Set();
  const allWindows = [...wins.slice(0, mx), ...extras];

  for (let i = 0; i < allWindows.length; i++) {
    const w = allWindows[i];
    const pool = exercises.filter((e) => isEligible(e, w, mode) && !used.has(e.id));
    let ex = forced[w.id] ? exercises.find((e) => e.id === forced[w.id]) : null;

    if (!ex) {
      if (!pool.length) continue;
      if (mode === "busy") {
        ex = [...pool].sort((a, b) => a.minutes - b.minutes || a.id.localeCompare(b.id))[0];
      } else {
        ex = pool[(n * 3 + i) % pool.length];
      }
    }

    used.add(ex.id);
    const scaled = scaleExercise(ex, info.level, settings.coin_multiplier, w.max_min);
    sessions.push({
      window: w.id,
      label: w.label,
      hint: w.hint,
      exercise_id: ex.id,
      name: ex.name,
      how: ex.how,
      kind: ex.kind || "strength",
      minutes: scaled.minutes,
      coins: scaled.coins,
      amount: scaled.amount,
      optional: i >= mx,
    });
  }

  return sessions;
}

export function planMeals(info, mode, settings, meals, potential, ov, n) {
  const slots = settings.meal_slots[info.daytype] || ["desayuno", "almuerzo", "merienda", "cena"];
  const forced = ov.meals || {};
  const pools = {};
  const chosen = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    let pool = meals.filter((m) => m.slot === slot).sort((a, b) => a.id.localeCompare(b.id));
    if (mode === "busy") {
      const quick = pool.filter((m) => m.tier === "quick");
      if (quick.length) pool = quick;
    }
    pools[slot] = pool;
    const pick = forced[slot] ? meals.find((m) => m.id === forced[slot]) : null;
    chosen.push(pick || pool[(n + i) % pool.length]);
  }

  while (chosen.reduce((sum, m) => sum + m.kcal, 0) > potential) {
    let maxIdx = 0;
    for (let k = 1; k < chosen.length; k++) {
      if (chosen[k].kcal > chosen[maxIdx].kcal) maxIdx = k;
    }
    const current = chosen[maxIdx];
    const cheaper = pools[current.slot].filter((m) => m.kcal < current.kcal);
    if (!cheaper.length) break;
    chosen[maxIdx] = cheaper.reduce((prev, curr) => (curr.kcal > prev.kcal ? curr : prev));
  }

  return chosen;
}

export function streakAt(settings, progress, n) {
  let streak = 0;
  for (let k = n; k >= 1; k--) {
    const done = progress.days?.[String(k)]?.done || [];
    if (done.length >= settings.streak_min_sessions) streak++;
    else break;
  }
  return streak;
}

export function calcLedger(settings, sessions, quest, pd, streak) {
  const doneSet = new Set(pd.done || []);
  const doneSessions = sessions.filter((x) => doneSet.has(x.window));
  const fromEx = doneSessions.reduce((sum, x) => sum + x.coins, 0);
  const bonus = {};

  if (pd.quest) {
    bonus["misión del día"] = quest.bonus;
  }
  const cb = settings.combo_bonus;
  if (doneSessions.length >= cb.min_sessions) {
    bonus["combo"] = cb.coins;
  }
  if (settings.streak_bonus?.[String(streak)]) {
    bonus[`racha ${streak} días`] = settings.streak_bonus[String(streak)];
  }

  const bonusSum = Object.values(bonus).reduce((a, b) => a + b, 0);
  const earned = settings.base_coins + fromEx + bonusSum;
  const spent = Object.values(pd.eaten || {}).reduce((sum, item) => sum + (item.kcal || 0), 0);

  return {
    base: settings.base_coins,
    exercise: fromEx,
    bonus,
    earned,
    spent,
    balance: earned - spent,
  };
}

export function renderDayMarkdown(plan, settings, progress = null, streak = 0) {
  const i = plan.info;
  const pd = progress?.days?.[String(plan.n)] || {};
  const doneSet = new Set(pd.done || []);
  const icon = plan.mode === "busy" ? "⚡ MODO PROYECTOS" : plan.mode === "rest" ? "🌿 DÍA SUAVE" : "🎮";

  const lines = [
    `## Día ${plan.n} · ${i.weekday} ${i.date} · Semana ${i.week} (x${i.level}) · ${icon}`,
    "",
    `**Misión del día:** ${plan.quest.text} (+${plan.quest.bonus} 🪙)`,
    "",
    "### 🏋️ Ejercicio (haz lo que puedas, en el orden que quieras)",
  ];

  for (const x of plan.sessions) {
    const mark = doneSet.has(x.window) ? "✅" : "⬜";
    const opt = x.optional ? " _(si hay tiempo)_" : "";
    const amt = x.amount ? ` — ${x.amount}` : "";
    lines.push(`- ${mark} \`${x.window}\` **${x.label}** (${x.hint})${opt}: ${x.name}${amt} · ~${x.minutes} min · **+${x.coins} 🪙**\n    ${x.how}`);
  }

  lines.push("", `### 🍽️ Comida (presupuesto posible hoy: ${plan.potential} 🪙; base gratis ${settings.base_coins})`);
  const eaten = pd.eaten || {};
  for (const m of plan.meals) {
    const mark = eaten[m.slot] ? "✅" : "⬜";
    lines.push(`- ${mark} \`${m.slot}\`: ${m.name} · prep ${m.prep_min} min · **-${m.kcal} 🪙** (${m.kcal} kcal)`);
  }

  if (progress) {
    const lg = calcLedger(settings, plan.sessions, plan.quest, pd, streak);
    const b = Object.entries(lg.bonus).map(([k, v]) => `${k} +${v}`).join(", ") || "ninguno";
    lines.push(
      "",
      `### 💰 Cartera: base ${lg.base} + ejercicio ${lg.exercise} + bonos (${b}) = **${lg.earned}** ganadas · gastadas **${lg.spent}** · saldo **${lg.balance}** 🪙 · racha ${streak} 🔥`
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function buildDayData(n = null) {
  const { settings, exercises, meals } = cachedCatalog;
  const dayNum = n === null ? todayNumber(settings) : Math.max(1, Math.min(n, settings.total_days));
  const info = dayInfo(settings, dayNum);
  const overrides = getOverrides();
  const ov = overrides[String(dayNum)] || {};
  const mode = ov.mode || (info.is_rest ? "rest" : "normal");

  const sessions = planExercises(info, mode, settings, exercises, ov, dayNum);
  const potential = settings.base_coins + sessions.filter((s) => !s.optional).reduce((sum, s) => sum + s.coins, 0);
  const chosenMeals = planMeals(info, mode, settings, meals, potential, ov, dayNum);
  const quest = settings.quests[(dayNum - 1) % settings.quests.length];

  const prog = getProgress();
  const pd = prog.days?.[String(dayNum)] || { done: [], quest: false, eaten: {} };
  const streak = streakAt(settings, prog, dayNum);
  const ledger = calcLedger(settings, sessions, quest, pd, streak);

  const doneSet = new Set(pd.done || []);
  const eatenMap = pd.eaten || {};
  const winMap = new Map((settings.windows[info.daytype] || []).map((w) => [w.id, w]));

  const enrichedSessions = sessions.map((s) => {
    const win = winMap.get(s.window) || { id: s.window, max_min: 999 };
    const eligible = exercises.filter((e) => isEligible(e, win, mode));
    const alts = eligible.map((e) => {
      const sc = scaleExercise(e, info.level, settings.coin_multiplier, win.max_min);
      return {
        id: e.id,
        name: e.name,
        minutes: e.minutes,
        coins: e.coins,
        scaled_minutes: sc.minutes,
        scaled_coins: sc.coins,
        amount: sc.amount,
        kind: e.kind,
      };
    });

    return {
      ...s,
      completed: doneSet.has(s.window),
      is_overridden: Boolean(ov.exercises?.[s.window]),
      alternatives: alts,
    };
  });

  const enrichedMeals = chosenMeals.map((m) => {
    const eatenEntry = eatenMap[m.slot];
    const alts = meals.filter((item) => item.slot === m.slot).map((item) => ({
      id: item.id,
      name: item.name,
      kcal: item.kcal,
      prep_min: item.prep_min,
      tier: item.tier,
    }));

    return {
      id: m.id,
      name: m.name,
      slot: m.slot,
      kcal: m.kcal,
      prep_min: m.prep_min,
      tier: m.tier,
      eaten: Boolean(eatenEntry),
      logged_kcal: eatenEntry ? eatenEntry.kcal : m.kcal,
      logged_name: eatenEntry ? eatenEntry.name : m.name,
      is_overridden: Boolean(ov.meals?.[m.slot]),
      alternatives: alts,
    };
  });

  const rawPlan = { n: dayNum, info, mode, sessions, meals: chosenMeals, quest, potential };
  const markdown = renderDayMarkdown(rawPlan, settings, prog, streak);

  return {
    n: dayNum,
    today_n: todayNumber(settings),
    total_days: settings.total_days,
    info,
    mode,
    sessions: enrichedSessions,
    meals: enrichedMeals,
    quest: {
      text: quest.text,
      bonus: quest.bonus,
      completed: Boolean(pd.quest),
    },
    potential,
    ledger,
    streak,
    combo_target: settings.combo_bonus,
    markdown,
  };
}

export function clientSetMode(dayNum, mode) {
  const overrides = getOverrides();
  const dayKey = String(dayNum);
  const ov = overrides[dayKey] || {};
  const { settings } = cachedCatalog;
  const info = dayInfo(settings, dayNum);
  const defaultMode = info.is_rest ? "rest" : "normal";

  if (mode === defaultMode) {
    delete ov.mode;
  } else {
    ov.mode = mode;
  }

  if (!Object.keys(ov).length) delete overrides[dayKey];
  else overrides[dayKey] = ov;

  saveOverrides(overrides);
  return buildDayData(dayNum);
}

export function clientToggleSession(dayNum, windowId, completed = null) {
  const prog = getProgress();
  const dayKey = String(dayNum);
  if (!prog.days[dayKey]) prog.days[dayKey] = { done: [], quest: false, eaten: {} };
  const pd = prog.days[dayKey];
  const isDone = pd.done.includes(windowId);
  const target = completed === null ? !isDone : completed;

  if (target && !isDone) pd.done.push(windowId);
  else if (!target && isDone) pd.done = pd.done.filter((w) => w !== windowId);

  saveProgress(prog);
  return buildDayData(dayNum);
}

export function clientOverrideExercise(dayNum, windowId, exerciseId) {
  const overrides = getOverrides();
  const dayKey = String(dayNum);
  if (!overrides[dayKey]) overrides[dayKey] = {};
  if (!overrides[dayKey].exercises) overrides[dayKey].exercises = {};

  if (exerciseId) {
    overrides[dayKey].exercises[windowId] = exerciseId;
  } else {
    delete overrides[dayKey].exercises[windowId];
    if (!Object.keys(overrides[dayKey].exercises).length) delete overrides[dayKey].exercises;
    if (!Object.keys(overrides[dayKey]).length) delete overrides[dayKey];
  }

  saveOverrides(overrides);
  return buildDayData(dayNum);
}

export function clientToggleQuest(dayNum, completed = null) {
  const prog = getProgress();
  const dayKey = String(dayNum);
  if (!prog.days[dayKey]) prog.days[dayKey] = { done: [], quest: false, eaten: {} };
  const pd = prog.days[dayKey];
  pd.quest = completed === null ? !pd.quest : Boolean(completed);
  saveProgress(prog);
  return buildDayData(dayNum);
}

export function clientLogMeal(dayNum, slot, payload) {
  const prog = getProgress();
  const dayKey = String(dayNum);
  if (!prog.days[dayKey]) prog.days[dayKey] = { done: [], quest: false, eaten: {} };
  const pd = prog.days[dayKey];
  if (!pd.eaten) pd.eaten = {};

  if (!payload.eaten) {
    delete pd.eaten[slot];
  } else {
    const day = buildDayData(dayNum);
    const planned = day.meals.find((m) => m.slot === slot);
    const kcal = payload.kcal !== undefined && payload.kcal !== null ? payload.kcal : planned ? planned.kcal : 0;
    const name = payload.name?.trim() || (planned ? planned.name : "libre");
    pd.eaten[slot] = { kcal, name };
  }

  saveProgress(prog);
  return buildDayData(dayNum);
}

export function clientOverrideMeal(dayNum, slot, mealId) {
  const overrides = getOverrides();
  const dayKey = String(dayNum);
  if (!overrides[dayKey]) overrides[dayKey] = {};
  if (!overrides[dayKey].meals) overrides[dayKey].meals = {};

  if (mealId) {
    overrides[dayKey].meals[slot] = mealId;
  } else {
    delete overrides[dayKey].meals[slot];
    if (!Object.keys(overrides[dayKey].meals).length) delete overrides[dayKey].meals;
    if (!Object.keys(overrides[dayKey]).length) delete overrides[dayKey];
  }

  saveOverrides(overrides);
  return buildDayData(dayNum);
}

export function clientResetDay(dayNum) {
  const prog = getProgress();
  delete prog.days[String(dayNum)];
  saveProgress(prog);

  const overrides = getOverrides();
  delete overrides[String(dayNum)];
  saveOverrides(overrides);

  return buildDayData(dayNum);
}

export function clientGetOverview() {
  const { settings, exercises, meals } = cachedCatalog;
  const prog = getProgress();
  const overrides = getOverrides();
  const todayN = todayNumber(settings);
  const days = [];
  const weekBuckets = new Map();

  for (let n = 1; n <= settings.total_days; n++) {
    const info = dayInfo(settings, n);
    const ov = overrides[String(n)] || {};
    const mode = ov.mode || (info.is_rest ? "rest" : "normal");
    const sessions = planExercises(info, mode, settings, exercises, ov, n);
    const potential = settings.base_coins + sessions.filter((s) => !s.optional).reduce((sum, s) => sum + s.coins, 0);
    const chosenMeals = planMeals(info, mode, settings, meals, potential, ov, n);
    const quest = settings.quests[(n - 1) % settings.quests.length];
    const pd = prog.days?.[String(n)] || { done: [], quest: false, eaten: {} };
    const st = streakAt(settings, prog, n);
    const lg = calcLedger(settings, sessions, quest, pd, st);

    const doneCount = (pd.done || []).length;
    const reqSessions = sessions.filter((s) => !s.optional).length;
    const questDone = Boolean(pd.quest);
    const mealsCount = Object.keys(pd.eaten || {}).length;
    const hasActivity = doneCount > 0 || questDone || mealsCount > 0;

    const entry = {
      n,
      date: info.date,
      weekday: info.weekday,
      daytype: info.daytype,
      week: info.week,
      level: info.level,
      mode,
      is_rest: info.is_rest,
      done_count: doneCount,
      required_sessions: reqSessions,
      total_sessions: sessions.length,
      quest_done: questDone,
      meals_eaten_count: mealsCount,
      total_meals: chosenMeals.length,
      potential,
      ledger: lg,
      streak: st,
      has_activity: hasActivity,
    };

    days.push(entry);
    if (!weekBuckets.has(info.week)) weekBuckets.set(info.week, []);
    weekBuckets.get(info.week).push(entry);
  }

  const activeDays = days.filter((d) => d.has_activity);
  const todayEntry = days[todayN - 1];
  const prevStreak = todayN > 1 ? days[todayN - 2].streak : 0;
  const currentStreak = todayEntry && todayEntry.done_count >= settings.streak_min_sessions ? todayEntry.streak : prevStreak;

  const summary = {
    today_n: todayN,
    total_days: settings.total_days,
    current_streak: currentStreak,
    best_streak: Math.max(0, ...days.map((d) => d.streak)),
    total_exercise_coins: days.reduce((sum, d) => sum + d.ledger.exercise, 0),
    total_bonus_coins: days.reduce((sum, d) => sum + Object.values(d.ledger.bonus).reduce((a, b) => a + b, 0), 0),
    total_earned_coins: activeDays.reduce((sum, d) => sum + d.ledger.earned, 0),
    total_spent_kcal: days.reduce((sum, d) => sum + d.ledger.spent, 0),
    cumulative_balance: activeDays.reduce((sum, d) => sum + d.ledger.balance, 0),
    total_sessions_done: days.reduce((sum, d) => sum + d.done_count, 0),
    total_required_sessions: days.reduce((sum, d) => sum + d.required_sessions, 0),
    total_quests_done: days.filter((d) => d.quest_done).length,
    active_days_count: activeDays.length,
  };

  const weeks = Array.from(weekBuckets.entries()).map(([weekNum, wDays]) => ({
    week: weekNum,
    level: wDays[0].level,
    days_count: wDays.length,
    active_days: wDays.filter((d) => d.has_activity).length,
    sessions_done: wDays.reduce((sum, d) => sum + d.done_count, 0),
    required_sessions: wDays.reduce((sum, d) => sum + d.required_sessions, 0),
    exercise_coins: wDays.reduce((sum, d) => sum + d.ledger.exercise, 0),
    bonus_coins: wDays.reduce((sum, d) => sum + Object.values(d.ledger.bonus).reduce((a, b) => a + b, 0), 0),
    spent_kcal: wDays.reduce((sum, d) => sum + d.ledger.spent, 0),
    quests_done: wDays.filter((d) => d.quest_done).length,
  }));

  return { summary, days, weeks };
}

export function clientExportMarkdown(includeProgress = false) {
  const { settings, exercises, meals } = cachedCatalog;
  const prog = includeProgress ? getProgress() : null;
  const overrides = getOverrides();
  const out = ["# Calorie Quest · 30 días\n"];

  for (let n = 1; n <= settings.total_days; n++) {
    const info = dayInfo(settings, n);
    const ov = overrides[String(n)] || {};
    const mode = ov.mode || (info.is_rest ? "rest" : "normal");
    const sessions = planExercises(info, mode, settings, exercises, ov, n);
    const potential = settings.base_coins + sessions.filter((s) => !s.optional).reduce((sum, s) => sum + s.coins, 0);
    const chosenMeals = planMeals(info, mode, settings, meals, potential, ov, n);
    const quest = settings.quests[(n - 1) % settings.quests.length];
    const plan = { n, info, mode, sessions, meals: chosenMeals, quest, potential };
    const st = prog ? streakAt(settings, prog, n) : 0;
    out.push(renderDayMarkdown(plan, settings, prog, st));
  }

  return { filename: "plan_30_dias.md", content: out.join("\n") };
}

export function clientGetCatalog() {
  return {
    settings: cachedCatalog.settings,
    exercises: cachedCatalog.exercises,
    meals: cachedCatalog.meals,
    overrides: getOverrides(),
  };
}

export function clientUpdateSettings(patch) {
  Object.assign(cachedCatalog.settings, patch);
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(cachedCatalog.settings));
  return { settings: cachedCatalog.settings };
}

export function clientSaveExercise(ex) {
  const idx = cachedCatalog.exercises.findIndex((e) => e.id === ex.id);
  if (idx >= 0) cachedCatalog.exercises[idx] = ex;
  else cachedCatalog.exercises.push(ex);
  localStorage.setItem(STORAGE_KEYS.exercises, JSON.stringify(cachedCatalog.exercises));
  return { exercises: cachedCatalog.exercises };
}

export function clientDeleteExercise(exId) {
  cachedCatalog.exercises = cachedCatalog.exercises.filter((e) => e.id !== exId);
  localStorage.setItem(STORAGE_KEYS.exercises, JSON.stringify(cachedCatalog.exercises));
  return { exercises: cachedCatalog.exercises };
}

export function clientSaveMeal(meal) {
  const idx = cachedCatalog.meals.findIndex((m) => m.id === meal.id);
  if (idx >= 0) cachedCatalog.meals[idx] = meal;
  else cachedCatalog.meals.push(meal);
  localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(cachedCatalog.meals));
  return { meals: cachedCatalog.meals };
}

export function clientDeleteMeal(mealId) {
  cachedCatalog.meals = cachedCatalog.meals.filter((m) => m.id !== mealId);
  localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(cachedCatalog.meals));
  return { meals: cachedCatalog.meals };
}
