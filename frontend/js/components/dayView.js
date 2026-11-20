/**
 * Vista principal "Misión Diaria": modo, quest, sesiones de ejercicio, comidas y cartera.
 */
import {
  escapeHtml,
  formatCoins,
  formatSlotLabel,
  getKindBadge,
  getModeMeta,
} from "../utils/formatters.js";

const openCustomMealSlots = new Set();

function renderSessionCard(session) {
  const kind = getKindBadge(session.kind);
  const doneClass = session.completed ? "done" : "";
  const optClass = session.optional ? "optional" : "";

  const altOptions = (session.alternatives || [])
    .map((alt) => {
      const amtText = alt.amount ? ` (${alt.amount})` : "";
      return `<option value="${escapeHtml(alt.id)}" ${alt.id === session.exercise_id ? "selected" : ""}>
        ${escapeHtml(alt.name)}${escapeHtml(amtText)} · ~${alt.scaled_minutes} min · +${alt.scaled_coins} 🪙
      </option>`;
    })
    .join("");

  return `
    <article class="item-card ${doneClass} ${optClass}">
      <div class="item-top">
        <div>
          <div class="item-title-row">
            <span class="badge badge-muted">${kind.icon} ${escapeHtml(kind.label)}</span>
            <span class="item-title">${escapeHtml(session.name)}${session.amount ? ` — ${escapeHtml(session.amount)}` : ""}</span>
            ${session.optional ? `<span class="badge badge-muted">Si hay tiempo</span>` : ""}
            ${session.is_overridden ? `<span class="badge badge-violet">Fijado</span>` : ""}
          </div>
          <div class="item-meta">
            <span><strong>${escapeHtml(session.label)}</strong> (${escapeHtml(session.hint)})</span>
            <span>· ~${session.minutes} min</span>
            <span>· <strong>+${session.coins} 🪙</strong></span>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-sm ${session.completed ? "btn-success" : "btn-primary"}"
          data-action="toggle-session"
          data-window="${escapeHtml(session.window)}"
          data-completed="${session.completed ? "false" : "true"}"
        >
          ${session.completed ? "✅ Hecho" : "⬜ Completar"}
        </button>
      </div>

      <p class="item-how">${escapeHtml(session.how)}</p>

      <div class="swap-row">
        <label class="muted" for="ex-swap-${escapeHtml(session.window)}">Cambiar:</label>
        <select
          id="ex-swap-${escapeHtml(session.window)}"
          class="select"
          data-action="override-exercise"
          data-window="${escapeHtml(session.window)}"
        >
          ${altOptions}
        </select>
        ${
          session.is_overridden
            ? `<button type="button" class="btn btn-sm btn-ghost" data-action="clear-exercise-override" data-window="${escapeHtml(session.window)}">Auto</button>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderMealCard(meal) {
  const doneClass = meal.eaten ? "done" : "";
  const isFormOpen = openCustomMealSlots.has(meal.slot);
  const displayName = meal.eaten ? meal.logged_name : meal.name;
  const displayKcal = meal.eaten ? meal.logged_kcal : meal.kcal;
  const isCustomLogged =
    meal.eaten && (meal.logged_name !== meal.name || meal.logged_kcal !== meal.kcal);

  const altOptions = (meal.alternatives || [])
    .map(
      (alt) => `<option value="${escapeHtml(alt.id)}" ${alt.id === meal.id ? "selected" : ""}>
        ${escapeHtml(alt.name)} · -${alt.kcal} 🪙 (${alt.tier})
      </option>`
    )
    .join("");

  return `
    <article class="item-card ${doneClass}">
      <div class="item-top">
        <div>
          <div class="item-title-row">
            <span class="badge badge-muted">${formatSlotLabel(meal.slot)}</span>
            <span class="item-title">${escapeHtml(displayName)}</span>
            <span class="badge ${meal.tier === "quick" ? "badge-busy" : "badge-muted"}">
              ${meal.tier === "quick" ? "⚡ Rápida" : "🍲 Normal"}
            </span>
            ${meal.is_overridden ? `<span class="badge badge-violet">Fijada</span>` : ""}
            ${isCustomLogged ? `<span class="badge badge-normal">Libre</span>` : ""}
          </div>
          <div class="item-meta">
            <span>Prep ${meal.prep_min} min</span>
            <span>· <strong>-${displayKcal} 🪙</strong> (${displayKcal} kcal)</span>
          </div>
        </div>

        <div class="item-actions">
          <button
            type="button"
            class="btn btn-sm"
            data-action="toggle-custom-meal"
            data-slot="${escapeHtml(meal.slot)}"
            title="Registrar una comida distinta"
          >
            ✏️ Libre
          </button>
          <button
            type="button"
            class="btn btn-sm ${meal.eaten ? "btn-success" : "btn-primary"}"
            data-action="toggle-meal"
            data-slot="${escapeHtml(meal.slot)}"
            data-eaten="${meal.eaten ? "false" : "true"}"
          >
            ${meal.eaten ? "✅ Comido" : "⬜ Registrar"}
          </button>
        </div>
      </div>

      ${
        isFormOpen
          ? `<form class="custom-meal-form" data-action="submit-custom-meal" data-slot="${escapeHtml(meal.slot)}">
              <input
                type="text"
                name="name"
                class="input"
                placeholder="Ej. Ceviche o menú del día"
                value="${escapeHtml(displayName)}"
                required
              />
              <input
                type="number"
                name="kcal"
                class="input"
                min="0"
                max="5000"
                value="${displayKcal}"
                required
              />
              <button type="submit" class="btn btn-sm btn-success">Guardar</button>
            </form>`
          : ""
      }

      <div class="swap-row">
        <label class="muted" for="meal-swap-${escapeHtml(meal.slot)}">Alternativa:</label>
        <select
          id="meal-swap-${escapeHtml(meal.slot)}"
          class="select"
          data-action="override-meal"
          data-slot="${escapeHtml(meal.slot)}"
        >
          ${altOptions}
        </select>
        ${
          meal.is_overridden
            ? `<button type="button" class="btn btn-sm btn-ghost" data-action="clear-meal-override" data-slot="${escapeHtml(meal.slot)}">Auto</button>`
            : ""
        }
      </div>
    </article>
  `;
}

export function renderDayView(container, dayPlan, handlers) {
  if (!dayPlan) {
    container.innerHTML = `<div class="card"><p class="muted">Cargando plan del día...</p></div>`;
    return;
  }

  const { n, info, mode, sessions, meals, quest, potential, ledger, streak, combo_target } = dayPlan;
  const requiredSessions = sessions.filter((s) => !s.optional);
  const optionalSessions = sessions.filter((s) => s.optional);
  const doneCount = sessions.filter((s) => s.completed).length;

  const budgetPct = potential > 0 ? Math.min(100, Math.round((ledger.spent / potential) * 100)) : 0;
  const budgetClass =
    ledger.spent > potential ? "danger" : budgetPct >= 88 ? "warn" : "";

  const bonusEntries = Object.entries(ledger.bonus || {});
  const comboReached = doneCount >= combo_target.min_sessions;

  const modes = ["normal", "busy", "rest"].map((m) => {
    const meta = getModeMeta(m);
    return `
      <button
        type="button"
        class="btn btn-sm mode-btn ${mode === m ? "active" : ""}"
        data-action="set-mode"
        data-mode="${m}"
      >
        ${meta.icon} ${escapeHtml(meta.label)}
      </button>
    `;
  }).join("");

  container.innerHTML = `
    <section class="card day-banner">
      <div>
        <h2 class="day-heading">
          Día ${n} · ${escapeHtml(info.weekday)} ${escapeHtml(info.date)}
        </h2>
        <span class="muted">
          Semana ${info.week} (x${info.level})
          ${info.is_rest ? "· 🌿 Día de descanso programado" : ""}
        </span>
      </div>

      <div class="item-actions">
        <div class="mode-group" role="group" aria-label="Modo del día">
          ${modes}
        </div>
        <button type="button" class="btn btn-sm btn-danger" id="btn-reset-day" title="Limpiar progreso y cambios del día">
          🔄 Reiniciar día
        </button>
      </div>
    </section>

    <section class="card quest-card ${quest.completed ? "completed" : ""}">
      <div>
        <div class="item-title-row">
          <span class="badge badge-violet">📜 Misión del día</span>
          <span class="badge badge-busy">+${quest.bonus} 🪙</span>
        </div>
        <h3 class="card-title" style="margin-top: 6px;">${escapeHtml(quest.text)}</h3>
      </div>
      <button
        type="button"
        class="btn ${quest.completed ? "btn-success" : "btn-primary"}"
        id="btn-toggle-quest"
      >
        ${quest.completed ? "✅ Misión cumplida" : "🎯 Reclamar misión"}
      </button>
    </section>

    <div class="two-col-grid">
      <section class="card stack-col">
        <div class="card-header" style="margin-bottom: 0;">
          <div>
            <h3 class="card-title">🏋️ Sesiones de Ejercicio</h3>
            <span class="muted">
              Completadas: ${doneCount}/${sessions.length} ·
              ${
                comboReached
                  ? `🔥 Combo activo (+${combo_target.coins} 🪙)`
                  : `Combo a las ${combo_target.min_sessions} sesiones (+${combo_target.coins} 🪙)`
              }
            </span>
          </div>
        </div>

        <div class="section-divider">Sesiones principales (${requiredSessions.length})</div>
        <div class="item-list">
          ${requiredSessions.map(renderSessionCard).join("")}
        </div>

        ${
          optionalSessions.length
            ? `<div class="section-divider">Opcionales — si hay tiempo (${optionalSessions.length})</div>
               <div class="item-list">${optionalSessions.map(renderSessionCard).join("")}</div>`
            : ""
        }
      </section>

      <div class="stack-col">
        <section class="card stack-col">
          <div class="card-header" style="margin-bottom: 0;">
            <div>
              <h3 class="card-title">🍽️ Comidas & Presupuesto</h3>
              <span class="muted">
                Gastadas ${ledger.spent} kcal de ${potential} 🪙 posibles hoy
              </span>
            </div>
          </div>

          <div class="progress-track" title="${budgetPct}% del presupuesto potencial usado">
            <div class="progress-fill ${budgetClass}" style="width: ${budgetPct}%;"></div>
          </div>

          <div class="item-list">
            ${meals.map(renderMealCard).join("")}
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <h3 class="card-title">💰 Cartera del Día</h3>
            <span class="badge badge-muted">🔥 Racha: ${streak} días</span>
          </div>
          <div class="ledger-rows">
            <div class="ledger-row">
              <span>Base diaria gratis</span>
              <strong>+${ledger.base} 🪙</strong>
            </div>
            <div class="ledger-row">
              <span>Ejercicio completado</span>
              <strong>+${ledger.exercise} 🪙</strong>
            </div>
            ${
              bonusEntries.length
                ? bonusEntries
                    .map(
                      ([label, val]) => `
                      <div class="ledger-row">
                        <span>Bono: ${escapeHtml(label)}</span>
                        <strong>+${val} 🪙</strong>
                      </div>`
                    )
                    .join("")
                : `<div class="ledger-row"><span>Bonos</span><span class="muted">ninguno aún</span></div>`
            }
            <div class="ledger-row">
              <span>Total ganadas</span>
              <strong>${ledger.earned} 🪙</strong>
            </div>
            <div class="ledger-row">
              <span>Total gastadas en comida</span>
              <strong>-${ledger.spent} 🪙</strong>
            </div>
            <div class="ledger-row total">
              <span>Saldo neto</span>
              <span style="color: ${ledger.balance >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)"};">
                ${formatCoins(ledger.balance)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-action="set-mode"]').forEach((btn) => {
    btn.addEventListener("click", () => handlers.onModeChange(btn.dataset.mode));
  });

  container.querySelector("#btn-reset-day")?.addEventListener("click", () => {
    if (window.confirm(`¿Reiniciar todo el progreso y overrides del Día ${n}?`)) {
      handlers.onResetDay();
    }
  });

  container.querySelector("#btn-toggle-quest")?.addEventListener("click", () => {
    handlers.onToggleQuest(!quest.completed);
  });

  container.querySelectorAll('[data-action="toggle-session"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const completed = btn.dataset.completed === "true";
      handlers.onToggleSession(btn.dataset.window, completed);
    });
  });

  container.querySelectorAll('[data-action="override-exercise"]').forEach((sel) => {
    sel.addEventListener("change", () => {
      handlers.onOverrideExercise(sel.dataset.window, sel.value);
    });
  });

  container.querySelectorAll('[data-action="clear-exercise-override"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      handlers.onOverrideExercise(btn.dataset.window, null);
    });
  });

  container.querySelectorAll('[data-action="toggle-meal"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const eaten = btn.dataset.eaten === "true";
      handlers.onLogMeal(btn.dataset.slot, { eaten });
    });
  });

  container.querySelectorAll('[data-action="toggle-custom-meal"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const slot = btn.dataset.slot;
      if (openCustomMealSlots.has(slot)) openCustomMealSlots.delete(slot);
      else openCustomMealSlots.add(slot);
      renderDayView(container, dayPlan, handlers);
    });
  });

  container.querySelectorAll('[data-action="submit-custom-meal"]').forEach((form) => {
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const slot = form.dataset.slot;
      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      const kcal = Number(fd.get("kcal"));
      openCustomMealSlots.delete(slot);
      handlers.onLogMeal(slot, { eaten: true, name, kcal });
    });
  });

  container.querySelectorAll('[data-action="override-meal"]').forEach((sel) => {
    sel.addEventListener("change", () => {
      handlers.onOverrideMeal(sel.dataset.slot, sel.value);
    });
  });

  container.querySelectorAll('[data-action="clear-meal-override"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      handlers.onOverrideMeal(btn.dataset.slot, null);
    });
  });
}
