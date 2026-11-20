/**
 * Bootstrapper del frontend modularizado de Calorie Quest.
 */
import * as api from "./api.js";
import { renderCatalogView } from "./components/catalogView.js";
import { renderDayView } from "./components/dayView.js";
import { renderHud } from "./components/hud.js";
import { renderMapView } from "./components/mapView.js";
import { renderStatsView } from "./components/statsView.js";
import { showToast } from "./components/toast.js";
import { getState, setState, subscribe } from "./state.js";

const TABS = [
  { id: "day", label: "🎯 Misión Diaria" },
  { id: "map", label: "🗺️ Mapa 30 Días" },
  { id: "stats", label: "📊 Economía & Progreso" },
  { id: "catalog", label: "🎒 Arsenal & Ajustes" },
];

const hudEl = document.getElementById("app-hud");
const tabsEl = document.getElementById("app-tabs");
const viewEl = document.getElementById("app-view");

function renderTabs(activeTab) {
  tabsEl.innerHTML = TABS.map(
    (tab) => `
      <button
        type="button"
        class="btn tab-btn ${tab.id === activeTab ? "active" : ""}"
        data-tab="${tab.id}"
      >
        ${tab.label}
      </button>
    `
  ).join("");

  tabsEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

async function runAction(promiseFn, successMessage = null, { refreshOverview = true } = {}) {
  try {
    const result = await promiseFn();
    if (successMessage) showToast(successMessage, "success");
    if (refreshOverview && getState().activeTab !== "day") {
      await loadOverview();
    }
    return result;
  } catch (err) {
    showToast(err.message || "Ocurrió un error inesperado", "error");
    return null;
  }
}

async function loadDay(dayNum = null) {
  try {
    const dayPlan = dayNum === null ? await api.fetchToday() : await api.fetchDay(dayNum);
    setState({ dayPlan, currentDayNum: dayPlan.n, error: null });
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadOverview() {
  try {
    const overview = await api.fetchOverview();
    setState({ overview });
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadCatalog() {
  try {
    const catalog = await api.fetchCatalog();
    setState({ catalog });
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function switchTab(tabId) {
  setState({ activeTab: tabId });
  if ((tabId === "map" || tabId === "stats") && !getState().overview) {
    await loadOverview();
  }
  if (tabId === "catalog" && !getState().catalog) {
    await loadCatalog();
  }
}

function updateDayPlanState(updatedDayPlan) {
  if (!updatedDayPlan) return;
  setState({
    dayPlan: updatedDayPlan,
    currentDayNum: updatedDayPlan.n,
    overview: null,
  });
}

const dayHandlers = {
  onModeChange: async (mode) => {
    const n = getState().currentDayNum;
    const plan = await runAction(() => api.updateDayMode(n, mode), `Modo cambiado a ${mode}`);
    updateDayPlanState(plan);
  },
  onResetDay: async () => {
    const n = getState().currentDayNum;
    const plan = await runAction(() => api.resetDay(n), `Día ${n} reiniciado`);
    updateDayPlanState(plan);
  },
  onToggleQuest: async (completed) => {
    const n = getState().currentDayNum;
    const plan = await runAction(
      () => api.toggleQuest(n, completed),
      completed ? "¡Misión cumplida! Bono sumado" : "Misión desmarcada"
    );
    updateDayPlanState(plan);
  },
  onToggleSession: async (windowId, completed) => {
    const n = getState().currentDayNum;
    const plan = await runAction(
      () => api.toggleSession(n, windowId, completed),
      completed ? "Sesión completada" : "Sesión desmarcada"
    );
    updateDayPlanState(plan);
  },
  onOverrideExercise: async (windowId, exerciseId) => {
    const n = getState().currentDayNum;
    const plan = await runAction(
      () => api.overrideExercise(n, windowId, exerciseId),
      exerciseId ? "Ejercicio actualizado" : "Rotación automática restaurada"
    );
    updateDayPlanState(plan);
  },
  onLogMeal: async (slot, payload) => {
    const n = getState().currentDayNum;
    const plan = await runAction(
      () => api.logMeal(n, slot, payload),
      payload.eaten ? `Comida registrada en ${slot}` : `Registro de ${slot} eliminado`
    );
    updateDayPlanState(plan);
  },
  onOverrideMeal: async (slot, mealId) => {
    const n = getState().currentDayNum;
    const plan = await runAction(
      () => api.overrideMeal(n, slot, mealId),
      mealId ? "Comida alternativa fijada" : "Menú automático restaurado"
    );
    updateDayPlanState(plan);
  },
};

const catalogHandlers = {
  onValidationError: (msg) => showToast(msg, "error"),
  onSaveSettings: async (patch) => {
    const res = await runAction(() => api.updateSettings(patch), "Ajustes guardados");
    if (res) {
      await Promise.all([loadCatalog(), loadDay(getState().currentDayNum)]);
      setState({ overview: null });
    }
  },
  onSaveExercise: async (exercise) => {
    const res = await runAction(() => api.saveExercise(exercise), `Ejercicio '${exercise.name}' guardado`);
    if (res) {
      await Promise.all([loadCatalog(), loadDay(getState().currentDayNum)]);
      setState({ overview: null });
    }
  },
  onDeleteExercise: async (exId) => {
    const res = await runAction(() => api.deleteExercise(exId), `Ejercicio '${exId}' eliminado`);
    if (res) {
      await Promise.all([loadCatalog(), loadDay(getState().currentDayNum)]);
      setState({ overview: null });
    }
  },
  onSaveMeal: async (meal) => {
    const res = await runAction(() => api.saveMeal(meal), `Comida '${meal.name}' guardada`);
    if (res) {
      await Promise.all([loadCatalog(), loadDay(getState().currentDayNum)]);
      setState({ overview: null });
    }
  },
  onDeleteMeal: async (mealId) => {
    const res = await runAction(() => api.deleteMeal(mealId), `Comida '${mealId}' eliminada`);
    if (res) {
      await Promise.all([loadCatalog(), loadDay(getState().currentDayNum)]);
      setState({ overview: null });
    }
  },
};

function render(state) {
  renderHud(hudEl, state.dayPlan, {
    onSelectDay: (dayNum) => loadDay(dayNum),
    onStepDay: (delta) => {
      if (!state.dayPlan) return;
      const target = Math.max(1, Math.min(state.dayPlan.total_days, state.dayPlan.n + delta));
      loadDay(target);
    },
    onGoToday: () => loadDay(null),
  });

  renderTabs(state.activeTab);

  if (state.activeTab === "day") {
    renderDayView(viewEl, state.dayPlan, dayHandlers);
  } else if (state.activeTab === "map") {
    renderMapView(viewEl, state.overview, state.currentDayNum, {
      onOpenDay: async (dayNum) => {
        await loadDay(dayNum);
        switchTab("day");
      },
    });
  } else if (state.activeTab === "stats") {
    renderStatsView(viewEl, state.overview, state.exportedMarkdown, {
      onExportMarkdown: async (includeProgress) => {
        const res = await runAction(
          () => api.exportMarkdown(includeProgress),
          "plan_30_dias.md generado correctamente",
          { refreshOverview: false }
        );
        if (res?.content) setState({ exportedMarkdown: res.content });
      },
      onDownloadMarkdown: () => {
        const content = getState().exportedMarkdown;
        if (!content) return;
        const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "plan_30_dias.md";
        link.click();
        URL.revokeObjectURL(url);
      },
    });
  } else if (state.activeTab === "catalog") {
    renderCatalogView(viewEl, state.catalog, catalogHandlers);
  }
}

document.addEventListener("keydown", (ev) => {
  const tag = ev.target?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  const { dayPlan } = getState();
  if (!dayPlan) return;
  if (ev.key === "ArrowLeft" && dayPlan.n > 1) loadDay(dayPlan.n - 1);
  if (ev.key === "ArrowRight" && dayPlan.n < dayPlan.total_days) loadDay(dayPlan.n + 1);
});

subscribe(render);
render(getState());
loadDay(null);
