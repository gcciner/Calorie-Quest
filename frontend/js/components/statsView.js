/**
 * Vista "Economía & Estadísticas": KPIs globales, resumen semanal y exportador Markdown.
 */
import { escapeHtml, formatCoins } from "../utils/formatters.js";

export function renderStatsView(
  container,
  overview,
  exportedMarkdown,
  { onExportMarkdown, onDownloadMarkdown }
) {
  if (!overview) {
    container.innerHTML = `<div class="card"><p class="muted">Cargando estadísticas...</p></div>`;
    return;
  }

  const { summary, weeks } = overview;
  const kpis = [
    { label: "Racha actual", value: `🔥 ${summary.current_streak} días` },
    { label: "Mejor racha", value: `🏆 ${summary.best_streak} días` },
    {
      label: "Sesiones hechas",
      value: `${summary.total_sessions_done} / ${summary.total_required_sessions}`,
    },
    { label: "Misiones cumplidas", value: `🎯 ${summary.total_quests_done} / ${summary.total_days}` },
    { label: "Monedas por ejercicio", value: `+${summary.total_exercise_coins} 🪙` },
    { label: "Monedas por bonos", value: `+${summary.total_bonus_coins} 🪙` },
    { label: "Kcal registradas", value: `${summary.total_spent_kcal} kcal` },
    { label: "Saldo neto (días activos)", value: formatCoins(summary.cumulative_balance) },
  ];

  const weekRows = weeks
    .map(
      (w) => `
      <tr>
        <td><strong>Semana ${w.week}</strong></td>
        <td>x${w.level}</td>
        <td>${w.active_days} / ${w.days_count}</td>
        <td>${w.sessions_done} / ${w.required_sessions}</td>
        <td>${w.quests_done}</td>
        <td>+${w.exercise_coins} 🪙</td>
        <td>+${w.bonus_coins} 🪙</td>
        <td>${w.spent_kcal} kcal</td>
      </tr>
    `
    )
    .join("");

  container.innerHTML = `
    <section class="kpi-grid">
      ${kpis
        .map(
          (k) => `
          <article class="kpi-card">
            <span class="muted">${escapeHtml(k.label)}</span>
            <span class="kpi-value">${escapeHtml(k.value)}</span>
          </article>
        `
        )
        .join("")}
    </section>

    <section class="card">
      <div class="card-header">
        <h3 class="card-title">📊 Progreso por Semana</h3>
        <span class="muted">Comparativa de intensidad, ejercicio y gasto calórico</span>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Semana</th>
              <th>Nivel</th>
              <th>Días activos</th>
              <th>Sesiones</th>
              <th>Misiones</th>
              <th>Ejercicio</th>
              <th>Bonos</th>
              <th>Kcal</th>
            </tr>
          </thead>
          <tbody>${weekRows}</tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">📄 Exportación Markdown (plan_30_dias.md)</h3>
          <span class="muted">Genera el archivo en el proyecto y descárgalo o previsualízalo aquí.</span>
        </div>
        <div class="item-actions">
          <label class="checkbox-chip">
            <input type="checkbox" id="chk-include-progress" />
            <span>Incluir progreso actual</span>
          </label>
          <button type="button" class="btn btn-primary" id="btn-export-md">Generar Markdown</button>
          <button type="button" class="btn btn-success" id="btn-download-md" ${exportedMarkdown ? "" : "disabled"}>
            ⬇️ Descargar .md
          </button>
        </div>
      </div>
      ${
        exportedMarkdown
          ? `<pre class="markdown-preview">${escapeHtml(exportedMarkdown)}</pre>`
          : `<p class="muted">Pulsa "Generar Markdown" para actualizar <code>plan_30_dias.md</code> y previsualizarlo.</p>`
      }
    </section>
  `;

  container.querySelector("#btn-export-md")?.addEventListener("click", () => {
    const includeProgress = Boolean(container.querySelector("#chk-include-progress")?.checked);
    onExportMarkdown(includeProgress);
  });

  container.querySelector("#btn-download-md")?.addEventListener("click", () => {
    onDownloadMarkdown();
  });
}
