/**
 * Small shared layout for scheduling emails. Every interpolated value is HTML-escaped.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c])
}

export interface EmailLayoutInput {
  heading: string
  intro?: string
  /** label/value rows rendered as a details card */
  details?: Array<{ label: string; value: string | null | undefined }>
  /** raw (already escaped / trusted) html paragraphs shown under the card */
  bodyHtml?: string
  cta?: { label: string; url: string }
  footer?: string
}

export function renderEmailLayout(input: EmailLayoutInput): string {
  const rows = (input.details ?? [])
    .filter((d) => d.value !== null && d.value !== undefined && String(d.value).trim() !== "")
    .map(
      (d) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(
          d.label
        )}</td><td style="padding:6px 0;font-size:14px;color:#111827;">${escapeHtml(d.value)}</td></tr>`
    )
    .join("")

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
      <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${escapeHtml(input.heading)}</h1>
      ${input.intro ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(input.intro)}</p>` : ""}
      ${rows ? `<table style="border-collapse:collapse;margin:0 0 16px;width:100%;background:#f9fafb;border-radius:8px;padding:8px 12px;" role="presentation">${rows}</table>` : ""}
      ${input.bodyHtml ?? ""}
      ${
        input.cta
          ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(input.cta.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(input.cta.label)}</a></p>`
          : ""
      }
    </div>
    <p style="margin:14px 0 0;font-size:12px;color:#9ca3af;text-align:center;">${escapeHtml(
      input.footer ?? "This is an automated message from the Recruitment Management System."
    )}</p>
  </div>
</body>
</html>`
}

export function appUrl(path: string): string {
  const base = (process.env.NEXTAUTH_URL || process.env.APP_URL || "").replace(/\/$/, "")
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}
