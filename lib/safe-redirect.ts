/** Only same-site relative paths are allowed as a post-action redirect target (blocks open redirects). */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null
  return value
}
