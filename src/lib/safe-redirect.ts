/**
 * Returns `value` only if it is a same-site path ("/members?x=1"), otherwise `fallback`.
 * Blocks open redirects such as "//evil.com", "/\evil.com" and "https://evil.com".
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback
  try {
    const base = "https://app.invalid"
    const url = new URL(value, base)
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : fallback
  } catch {
    return fallback
  }
}
