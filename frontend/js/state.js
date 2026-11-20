/**
 * Store reactivo centralizado con patrón pub/sub.
 */

const state = {
  activeTab: "day",
  currentDayNum: null,
  dayPlan: null,
  overview: null,
  catalog: null,
  exportedMarkdown: "",
  loading: false,
  error: null,
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(partial) {
  Object.assign(state, partial);
  for (const listener of listeners) {
    listener(state);
  }
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
