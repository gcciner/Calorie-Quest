/**
 * Vista "Mapa 30 Días": calendario interactivo agrupado por semanas.
 */
import { escapeHtml, formatCoins, getModeMeta } from "../utils/formatters.js";

export function renderMapView(container, overview, currentDayNum, { onOpenDay }) {
  if (!overview) {
    container.innerHTML = `<div class="card"><p class="muted">Cargando mapa de 30 días...</p></div>`;
    return;
  }

  const { summary, days } = overview;
  const grouped = new Map();
  for (const d of days) {
    if (!grouped.has(d.week)) grouped.set(d.week, []);
    grouped.get(d.week).push(d);
  }

  const weekSections = Array.from(grouped.entries())
    .map(([weekNum, weekDays]) => {
      const level = weekDays[0]?.level ?? 1;
      const tiles = weekDays
        .map((d) => {
          const modeMeta = getModeMeta(d.mode);
          const classes = [
            "day-tile",
            d.n === currentDayNum ? "selected" : "",
            d.n === summary.today_n ? "today" : "",
            d.has_activity ? "active" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return `
            <button type="button" class="${classes}" data-day="${d.n}">
              <div class="day-tile-top">
                <span>Día ${d.n} ${d.n === summary.today_n ? "📍" : ""}</span>
                <span>${modeMeta.icon}</span>
              </div>
              <div class="muted">${escapeHtml(d.weekday.slice(0, 3))} · ${escapeHtml(d.date)}</div>
              <div class="item-meta">
                <span>🏋️ ${d.done_count}/${d.required_sessions}</span>
                <span>${d.quest_done ? "⭐ Misión" : "⬜ Misión"}</span>
              </div>
              <div class="item-meta">
                <span>🍽️ ${d.meals_eaten_count}/${d.total_meals}</span>
                <span>🔥 ${d.streak}</span>
              </div>
              <div style="font-weight: 700; font-size: 0.84rem; color: ${
                d.ledger.balance >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)"
              };">
                Saldo ${formatCoins(d.ledger.balance)}
              </div>
            </button>
          `;
        })
        .join("");

      return `
        <section class="card">
          <div class="card-header">
            <h3 class="card-title">Semana ${weekNum} · Multiplicador x${level}</h3>
            <span class="muted">${weekDays.filter((x) => x.has_activity).length}/${weekDays.length} días activos</span>
          </div>
          <div class="map-grid">${tiles}</div>
        </section>
      `;
    })
    .join("");

  container.innerHTML = `
    <section class="card day-banner">
      <div>
        <h2 class="day-heading">🗺️ Mapa de Campaña (30 Días)</h2>
        <span class="muted">Haz clic en cualquier día para abrir su misión diaria y registrar actividad.</span>
      </div>
      <div class="hud-metrics">
        <span class="metric-pill streak">🔥 Mejor racha: ${summary.best_streak} d</span>
        <span class="metric-pill gold">🏋️ +${summary.total_exercise_coins} 🪙 ejercicio</span>
        <span class="metric-pill positive">📅 ${summary.active_days_count}/${summary.total_days} días activos</span>
      </div>
    </section>
    ${weekSections}
  `;

  container.querySelectorAll(".day-tile").forEach((tile) => {
    tile.addEventListener("click", () => onOpenDay(Number(tile.dataset.day)));
  });
}
