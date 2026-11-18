/** Escape a value for interpolation into an HTML email string (text or quoted attribute). */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Copy of `params` with every string value HTML-escaped (other values untouched). */
export function escapeParams<T extends Record<string, unknown>>(params: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) out[k] = typeof v === "string" ? escapeHtml(v) : v;
  return out as T;
}
