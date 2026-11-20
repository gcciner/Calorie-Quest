/**
 * Cliente HTTP universal para Calorie Quest.
 * Detecta automáticamente si el backend REST FastAPI está activo;
 * si no está disponible (como en GitHub Pages o modo estático), conmuta
 * de forma transparente al motor cliente 'clientEngine' con persistencia en localStorage.
 */

import * as client from "./clientEngine.js";

let backendAvailable = null;

async function checkBackend() {
  if (backendAvailable !== null) return backendAvailable;
  // Si estamos en github.io o file://, ir directo a modo cliente
  if (
    typeof window !== "undefined" &&
    (window.location.hostname.endsWith("github.io") || window.location.protocol === "file:")
  ) {
    backendAvailable = false;
    await client.initClientEngine();
    return false;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600);
    const res = await fetch("/api/health", { signal: controller.signal });
    clearTimeout(timer);
    backendAvailable = res.ok;
  } catch (_) {
    backendAvailable = false;
  }

  if (!backendAvailable) {
    await client.initClientEngine();
  }
  return backendAvailable;
}

async function request(url, options = {}) {
  const isServer = await checkBackend();
  if (!isServer) {
    throw new Error("Backend offline; usar métodos universales");
  }

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  const response = await fetch(url, config);
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail = typeof data === "object" && data?.detail ? data.detail : `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return data;
}

export async function fetchToday() {
  const isServer = await checkBackend();
  return isServer ? request("/api/days/today") : client.buildDayData(null);
}

export async function fetchDay(dayNum) {
  const isServer = await checkBackend();
  return isServer ? request(`/api/days/${dayNum}`) : client.buildDayData(dayNum);
}

export async function updateDayMode(dayNum, mode) {
  const isServer = await checkBackend();
  return isServer
    ? request(`/api/days/${dayNum}/mode`, { method: "PATCH", body: JSON.stringify({ mode }) })
    : client.clientSetMode(dayNum, mode);
}

export async function toggleSession(dayNum, windowId, completed = null) {
  const isServer = await checkBackend();
  return isServer
    ? request(`/api/days/${dayNum}/sessions/${encodeURIComponent(windowId)}/toggle`, {
        method: "POST",
        body: JSON.stringify({ completed }),
      })
    : client.clientToggleSession(dayNum, windowId, completed);
}

export async function overrideExercise(dayNum, windowId, exerciseId) {
  const isServer = await checkBackend();
  return isServer
    ? request(`/api/days/${dayNum}/sessions/${encodeURIComponent(windowId)}/override`, {
        method: "PUT",
        body: JSON.stringify({ exercise_id: exerciseId || null }),
      })
    : client.clientOverrideExercise(dayNum, windowId, exerciseId);
}

export async function toggleQuest(dayNum, completed = null) {
  const isServer = await checkBackend();
  return isServer
    ? request(`/api/days/${dayNum}/quest/toggle`, {
        method: "POST",
        body: JSON.stringify({ completed }),
      })
    : client.clientToggleQuest(dayNum, completed);
}

export async function logMeal(dayNum, slot, payload) {
  const isServer = await checkBackend();
  return isServer
    ? request(`/api/days/${dayNum}/meals/${encodeURIComponent(slot)}`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    : client.clientLogMeal(dayNum, slot, payload);
}

export async function overrideMeal(dayNum, slot, mealId) {
  const isServer = await checkBackend();
  return isServer
    ? request(`/api/days/${dayNum}/meals/${encodeURIComponent(slot)}/override`, {
        method: "PUT",
        body: JSON.stringify({ meal_id: mealId || null }),
      })
    : client.clientOverrideMeal(dayNum, slot, mealId);
}

export async function resetDay(dayNum) {
  const isServer = await checkBackend();
  return isServer
    ? request(`/api/days/${dayNum}/progress`, { method: "DELETE" })
    : client.clientResetDay(dayNum);
}

export async function fetchOverview() {
  const isServer = await checkBackend();
  return isServer ? request("/api/overview") : client.clientGetOverview();
}

export async function exportMarkdown(includeProgress = false) {
  const isServer = await checkBackend();
  return isServer
    ? request(`/api/export/markdown?include_progress=${includeProgress ? "true" : "false"}`, {
        method: "POST",
      })
    : client.clientExportMarkdown(includeProgress);
}

export async function fetchCatalog() {
  const isServer = await checkBackend();
  return isServer ? request("/api/catalog") : client.clientGetCatalog();
}

export async function updateSettings(patch) {
  const isServer = await checkBackend();
  return isServer
    ? request("/api/catalog/settings", { method: "PATCH", body: JSON.stringify(patch) })
    : client.clientUpdateSettings(patch);
}

export async function saveExercise(exercise) {
  const isServer = await checkBackend();
  return isServer
    ? request("/api/catalog/exercises", { method: "POST", body: JSON.stringify(exercise) })
    : client.clientSaveExercise(exercise);
}

export async function deleteExercise(exerciseId) {
  const isServer = await checkBackend();
  return isServer
    ? request(`/api/catalog/exercises/${encodeURIComponent(exerciseId)}`, { method: "DELETE" })
    : client.clientDeleteExercise(exerciseId);
}

export async function saveMeal(meal) {
  const isServer = await checkBackend();
  return isServer
    ? request("/api/catalog/meals", { method: "POST", body: JSON.stringify(meal) })
    : client.clientSaveMeal(meal);
}

export async function deleteMeal(mealId) {
  const isServer = await checkBackend();
  return isServer
    ? request(`/api/catalog/meals/${encodeURIComponent(mealId)}`, { method: "DELETE" })
    : client.clientDeleteMeal(mealId);
}
