export const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function resolveMediaUrl(path) {
  if (!path) return path;
  if (/^(https?|blob|data):/i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}
