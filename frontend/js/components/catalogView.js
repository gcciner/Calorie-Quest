/**
 * Vista "Arsenal & Ajustes": editor de settings.json, exercises.json y meals.json.
 */
import { escapeHtml, getKindBadge } from "../utils/formatters.js";

let editingExercise = null;
let editingMeal = null;

function allUniqueWindows(settings) {
  const seen = new Map();
  for (const list of Object.values(settings?.windows || {})) {
    for (const w of list) {
      if (!seen.has(w.id)) seen.set(w.id, w.label);
    }
  }
  return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
}

export function renderCatalogView(container, catalog, handlers) {
  if (!catalog) {
    container.innerHTML = `<div class="card"><p class="muted">Cargando arsenal y ajustes...</p></div>`;
    return;
  }

  const { settings, exercises, meals } = catalog;
  const windows = allUniqueWindows(settings);
  const selectedWinSet = new Set(editingExercise?.windows || ["wake", "night"]);

  const exerciseItems = exercises
    .map((ex) => {
      const kind = getKindBadge(ex.kind);
      return `
        <div class="item-card">
          <div class="item-top">
            <div>
              <div class="item-title-row">
                <span class="badge badge-muted">${kind.icon} ${escapeHtml(ex.id)}</span>
                <span class="item-title">${escapeHtml(ex.name)}</span>
              </div>
              <div class="item-meta">
                <span>${ex.minutes} min · +${ex.coins} 🪙</span>
                ${ex.base ? `<span>· base ${ex.base} ${escapeHtml(ex.unit || "")}</span>` : ""}
                <span>· ventanas: ${escapeHtml((ex.windows || []).join(", "))}</span>
              </div>
            </div>
            <div class="item-actions">
              <button type="button" class="btn btn-sm" data-action="edit-ex" data-id="${escapeHtml(ex.id)}">✏️</button>
              <button type="button" class="btn btn-sm btn-danger" data-action="del-ex" data-id="${escapeHtml(ex.id)}">🗑️</button>
            </div>
          </div>
          <p class="item-how">${escapeHtml(ex.how)}</p>
        </div>
      `;
    })
    .join("");

  const mealItems = meals
    .map(
      (m) => `
      <div class="item-card">
        <div class="item-top">
          <div>
            <div class="item-title-row">
              <span class="badge badge-muted">${escapeHtml(m.id)}</span>
              <span class="item-title">${escapeHtml(m.name)}</span>
              <span class="badge ${m.tier === "quick" ? "badge-busy" : "badge-muted"}">${escapeHtml(m.tier)}</span>
            </div>
            <div class="item-meta">
              <span>${escapeHtml(m.slot)}</span>
              <span>· -${m.kcal} 🪙 (${m.kcal} kcal)</span>
              <span>· prep ${m.prep_min} min</span>
            </div>
          </div>
          <div class="item-actions">
            <button type="button" class="btn btn-sm" data-action="edit-meal" data-id="${escapeHtml(m.id)}">✏️</button>
            <button type="button" class="btn btn-sm btn-danger" data-action="del-meal" data-id="${escapeHtml(m.id)}">🗑️</button>
          </div>
        </div>
      </div>
    `
    )
    .join("");

  container.innerHTML = `
    <section class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">⚙️ Configuración de Campaña (settings.json)</h3>
          <span class="muted">Los cambios se aplican inmediatamente al cálculo de los 30 días.</span>
        </div>
      </div>
      <form id="form-settings" class="form-grid">
        <label class="form-field">
          <span>Fecha de inicio</span>
          <input class="input" type="date" name="start_date" value="${escapeHtml(settings.start_date)}" required />
        </label>
        <label class="form-field">
          <span>Monedas base diarias</span>
          <input class="input" type="number" name="base_coins" min="0" max="10000" value="${settings.base_coins}" required />
        </label>
        <label class="form-field">
          <span>Multiplicador de monedas</span>
          <input class="input" type="number" name="coin_multiplier" step="0.05" min="0.1" max="10" value="${settings.coin_multiplier}" required />
        </label>
        <label class="form-field">
          <span>Mín. sesiones para racha</span>
          <input class="input" type="number" name="streak_min_sessions" min="1" max="10" value="${settings.streak_min_sessions}" required />
        </label>
        <label class="form-field">
          <span>Días de descanso (ej: 7, 14, 21, 28)</span>
          <input class="input" type="text" name="rest_days" value="${escapeHtml((settings.rest_days || []).join(", "))}" />
        </label>
        <div class="form-field" style="justify-content: flex-end;">
          <button type="submit" class="btn btn-primary">Guardar ajustes</button>
        </div>
      </form>
    </section>

    <div class="catalog-grid">
      <section class="card">
        <div class="card-header">
          <h3 class="card-title">🏋️ Arsenal de Ejercicios (${exercises.length})</h3>
          ${
            editingExercise
              ? `<button type="button" class="btn btn-sm btn-ghost" id="btn-cancel-ex">Cancelar edición</button>`
              : ""
          }
        </div>

        <form id="form-exercise" class="stack-col">
          <div class="form-grid">
            <label class="form-field">
              <span>ID único</span>
              <input class="input" name="id" value="${escapeHtml(editingExercise?.id || "")}" placeholder="ej. jumping_rope" required />
            </label>
            <label class="form-field">
              <span>Nombre</span>
              <input class="input" name="name" value="${escapeHtml(editingExercise?.name || "")}" placeholder="Saltar cuerda" required />
            </label>
            <label class="form-field">
              <span>Tipo</span>
              <select class="select" name="kind">
                ${["strength", "walk", "run", "stretch", "game", "bus"]
                  .map(
                    (k) => `<option value="${k}" ${(editingExercise?.kind || "strength") === k ? "selected" : ""}>${k}</option>`
                  )
                  .join("")}
              </select>
            </label>
            <label class="form-field">
              <span>Minutos</span>
              <input class="input" type="number" name="minutes" min="1" max="180" value="${editingExercise?.minutes ?? 5}" required />
            </label>
            <label class="form-field">
              <span>Monedas</span>
              <input class="input" type="number" name="coins" min="0" max="5000" value="${editingExercise?.coins ?? 50}" required />
            </label>
            <label class="form-field">
              <span>Cantidad base (opcional)</span>
              <input class="input" type="number" name="base" min="0" value="${editingExercise?.base ?? 0}" />
            </label>
            <label class="form-field">
              <span>Unidad (reps, min, seg...)</span>
              <input class="input" name="unit" value="${escapeHtml(editingExercise?.unit || "")}" placeholder="reps" />
            </label>
          </div>

          <label class="form-field">
            <span>Cómo hacerlo</span>
            <input class="input" name="how" value="${escapeHtml(editingExercise?.how || "")}" placeholder="Indicaciones breves" required />
          </label>

          <div class="form-field">
            <span>Ventanas habilitadas</span>
            <div class="checkbox-grid">
              ${windows
                .map(
                  (w) => `
                  <label class="checkbox-chip">
                    <input type="checkbox" name="windows" value="${escapeHtml(w.id)}" ${selectedWinSet.has(w.id) ? "checked" : ""} />
                    <span>${escapeHtml(w.id)}</span>
                  </label>
                `
                )
                .join("")}
            </div>
          </div>

          <button type="submit" class="btn btn-success">
            ${editingExercise ? "Actualizar ejercicio" : "Agregar ejercicio"}
          </button>
        </form>

        <div class="catalog-list">${exerciseItems}</div>
      </section>

      <section class="card">
        <div class="card-header">
          <h3 class="card-title">🍽️ Menú de Comidas (${meals.length})</h3>
          ${
            editingMeal
              ? `<button type="button" class="btn btn-sm btn-ghost" id="btn-cancel-meal">Cancelar edición</button>`
              : ""
          }
        </div>

        <form id="form-meal" class="stack-col">
          <div class="form-grid">
            <label class="form-field">
              <span>ID único</span>
              <input class="input" name="id" value="${escapeHtml(editingMeal?.id || "")}" placeholder="ej. a5" required />
            </label>
            <label class="form-field">
              <span>Nombre del plato</span>
              <input class="input" name="name" value="${escapeHtml(editingMeal?.name || "")}" placeholder="Ensalada César con pollo" required />
            </label>
            <label class="form-field">
              <span>Horario</span>
              <select class="select" name="slot">
                ${["desayuno", "almuerzo", "merienda", "cena"]
                  .map(
                    (s) => `<option value="${s}" ${(editingMeal?.slot || "almuerzo") === s ? "selected" : ""}>${s}</option>`
                  )
                  .join("")}
              </select>
            </label>
            <label class="form-field">
              <span>Kcal (= costo en 🪙)</span>
              <input class="input" type="number" name="kcal" min="0" max="5000" value="${editingMeal?.kcal ?? 450}" required />
            </label>
            <label class="form-field">
              <span>Prep (min)</span>
              <input class="input" type="number" name="prep_min" min="0" max="240" value="${editingMeal?.prep_min ?? 10}" required />
            </label>
            <label class="form-field">
              <span>Tier</span>
              <select class="select" name="tier">
                <option value="quick" ${editingMeal?.tier === "quick" ? "selected" : ""}>quick (Modo proyectos)</option>
                <option value="normal" ${(editingMeal?.tier || "normal") === "normal" ? "selected" : ""}>normal</option>
              </select>
            </label>
          </div>

          <button type="submit" class="btn btn-success">
            ${editingMeal ? "Actualizar comida" : "Agregar comida"}
          </button>
        </form>

        <div class="catalog-list">${mealItems}</div>
      </section>
    </div>
  `;

  container.querySelector("#form-settings")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const restDays = String(fd.get("rest_days") || "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1);

    handlers.onSaveSettings({
      start_date: String(fd.get("start_date")),
      base_coins: Number(fd.get("base_coins")),
      coin_multiplier: Number(fd.get("coin_multiplier")),
      streak_min_sessions: Number(fd.get("streak_min_sessions")),
      rest_days: restDays,
    });
  });

  container.querySelector("#form-exercise")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const selectedWindows = fd.getAll("windows").map(String);
    if (!selectedWindows.length) {
      handlers.onValidationError("Selecciona al menos una ventana para el ejercicio.");
      return;
    }
    const payload = {
      id: String(fd.get("id")).trim(),
      name: String(fd.get("name")).trim(),
      kind: String(fd.get("kind")),
      minutes: Number(fd.get("minutes")),
      coins: Number(fd.get("coins")),
      base: Number(fd.get("base") || 0),
      unit: String(fd.get("unit") || "").trim(),
      how: String(fd.get("how")).trim(),
      windows: selectedWindows,
    };
    editingExercise = null;
    handlers.onSaveExercise(payload);
  });

  container.querySelector("#form-meal")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const payload = {
      id: String(fd.get("id")).trim(),
      name: String(fd.get("name")).trim(),
      slot: String(fd.get("slot")),
      kcal: Number(fd.get("kcal")),
      prep_min: Number(fd.get("prep_min") || 0),
      tier: String(fd.get("tier")),
    };
    editingMeal = null;
    handlers.onSaveMeal(payload);
  });

  container.querySelector("#btn-cancel-ex")?.addEventListener("click", () => {
    editingExercise = null;
    renderCatalogView(container, catalog, handlers);
  });

  container.querySelector("#btn-cancel-meal")?.addEventListener("click", () => {
    editingMeal = null;
    renderCatalogView(container, catalog, handlers);
  });

  container.querySelectorAll('[data-action="edit-ex"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      editingExercise = exercises.find((e) => e.id === btn.dataset.id) || null;
      renderCatalogView(container, catalog, handlers);
    });
  });

  container.querySelectorAll('[data-action="del-ex"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      if (window.confirm(`¿Eliminar ejercicio '${btn.dataset.id}'?`)) {
        handlers.onDeleteExercise(btn.dataset.id);
      }
    });
  });

  container.querySelectorAll('[data-action="edit-meal"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      editingMeal = meals.find((m) => m.id === btn.dataset.id) || null;
      renderCatalogView(container, catalog, handlers);
    });
  });

  container.querySelectorAll('[data-action="del-meal"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      if (window.confirm(`¿Eliminar comida '${btn.dataset.id}'?`)) {
        handlers.onDeleteMeal(btn.dataset.id);
      }
    });
  });
}
