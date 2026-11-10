/**
 * Only same-site relative paths are allowed as post-login destinations
 * (prevents open redirects such as ?next=//evil.example).
 */
export function safeNextPath(value: unknown, fallback = "/workspaces"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.length > 500) return fallback;
  return value;
}
