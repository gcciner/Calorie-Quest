/**
 * Utilidades de formateo y sanitización HTML.
 */

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatCoins(value, { signed = false } = {}) {
  const num = Number(value) || 0;
  const prefix = signed && num > 0 ? "+" : "";
  return `${prefix}${num} 🪙`;
}

export function getModeMeta(mode) {
  switch (mode) {
    case "busy":
      return { id: "busy", label: "Modo Proyectos", icon: "⚡", badgeClass: "badge-busy" };
    case "rest":
      return { id: "rest", label: "Día Suave", icon: "🌿", badgeClass: "badge-rest" };
    default:
      return { id: "normal", label: "Normal", icon: "🎮", badgeClass: "badge-normal" };
  }
}

export function getKindBadge(kind) {
  const map = {
    strength: { label: "Fuerza", icon: "💪" },
    walk: { label: "Caminata", icon: "🚶" },
    run: { label: "Cardio", icon: "🏃" },
    stretch: { label: "Movilidad", icon: "🧘" },
    game: { label: "Mini-Juego", icon: "🎲" },
    bus: { label: "En tránsito", icon: "🚌" },
  };
  return map[kind] || { label: kind || "Actividad", icon: "🏋️" };
}

export function formatSlotLabel(slot) {
  const map = {
    desayuno: "☀️ Desayuno",
    almuerzo: "🍽️ Almuerzo",
    merienda: "🍎 Merienda",
    cena: "🌙 Cena",
  };
  return map[slot] || slot;
}
