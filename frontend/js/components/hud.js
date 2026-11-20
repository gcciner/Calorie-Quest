/**
 * Barra superior RPG (HUD): navegación de días, racha, nivel y cartera.
 */
import { escapeHtml, formatCoins, getModeMeta } from "../utils/formatters.js";

export function renderHud(container, dayPlan, { onSelectDay, onStepDay, onGoToday }) {
  if (!dayPlan) {
    container.innerHTML = `
      <div class="hud-brand">
        <h1 class="hud-title">⚔️ Calorie Quest</h1>
        <span class="hud-subtitle">Cargando campaña...</span>
      </div>
    `;
    return;
  }

  const { n, today_n: todayN, total_days: totalDays, info, mode, ledger, streak } = dayPlan;
  const modeMeta = getModeMeta(mode);
  const balanceClass = ledger.balance >= 0 ? "positive" : "negative";

  const dayOptions = Array.from({ length: totalDays }, (_, idx) => {
    const dayNumber = idx + 1;
    const isTodayTag = dayNumber === todayN ? " (Hoy)" : "";
    return `<option value="${dayNumber}" ${dayNumber === n ? "selected" : ""}>Día ${dayNumber}${isTodayTag}</option>`;
  }).join("");

  container.innerHTML = `
    <div class="hud-brand">
      <h1 class="hud-title">
        <span>⚔️ Calorie Quest</span>
        <span class="badge ${modeMeta.badgeClass}">${modeMeta.icon} ${escapeHtml(modeMeta.label)}</span>
      </h1>
      <span class="hud-subtitle">
        ${escapeHtml(info.weekday)} ${escapeHtml(info.date)} · Semana ${info.week} · Nivel x${info.level}
      </span>
    </div>

    <div class="hud-nav">
      <button type="button" class="btn btn-sm" id="hud-prev" ${n <= 1 ? "disabled" : ""} title="Día anterior (←)">◀</button>
      <select id="hud-day-select" class="select" aria-label="Seleccionar día">${dayOptions}</select>
      <button type="button" class="btn btn-sm" id="hud-next" ${n >= totalDays ? "disabled" : ""} title="Día siguiente (→)">▶</button>
      <button type="button" class="btn btn-sm ${n === todayN ? "btn-primary" : ""}" id="hud-today">Hoy (Día ${todayN})</button>
    </div>

    <div class="hud-metrics">
      <span class="metric-pill streak" title="Racha consecutiva">🔥 ${streak} d</span>
      <span class="metric-pill gold" title="Monedas ganadas hoy">+${ledger.earned} 🪙</span>
      <span class="metric-pill" title="Kcal gastadas hoy">🍽️ -${ledger.spent}</span>
      <span class="metric-pill ${balanceClass}" title="Saldo neto del día">Saldo ${formatCoins(ledger.balance)}</span>
    </div>
  `;

  container.querySelector("#hud-prev")?.addEventListener("click", () => onStepDay(-1));
  container.querySelector("#hud-next")?.addEventListener("click", () => onStepDay(1));
  container.querySelector("#hud-today")?.addEventListener("click", () => onGoToday());
  container.querySelector("#hud-day-select")?.addEventListener("change", (ev) => {
    onSelectDay(Number(ev.target.value));
  });
}
