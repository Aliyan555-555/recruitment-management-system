import { PrismaClient } from "@prisma/client"

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// A missing DATABASE_URL is reported once at boot by instrumentation.ts (lib/env.ts).
// Throwing here would take down every route and the auth handler at import time.
// Prisma's default pool is (CPU cores * 2 + 1) per process, which can exceed the Supabase pooler's
// client limit on a big host and cause "Timed out fetching a new connection" errors. Cap it unless the
// URL already sets it. Override with PRISMA_CONNECTION_LIMIT / PRISMA_POOL_TIMEOUT.
function datasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT || "10")
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT || "30")
    return url.toString()
  } catch {
    return raw
  }
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    datasourceUrl: datasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma
}

