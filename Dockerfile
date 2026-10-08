# syntax=docker/dockerfile:1
# ==============================================================
# Multi-stage build — ATS Application
# Node 22 + Chromium (Puppeteer) — Production-hardened
# ==============================================================

# ──────────────────────────────────────────────────────────────
# STAGE 1: base
#   Shared OS layer — system deps + tini only.
# ──────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS base
WORKDIR /app

# Install only the minimal shared system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    tini \
    # ── Chromium runtime shared libraries ──────────────────
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    wget \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV NEXT_TELEMETRY_DISABLED=1

# ──────────────────────────────────────────────────────────────
# STAGE 1b: build-base
#   Build-time-only placeholder env vars that Next.js or Prisma may
#   validate while building. Kept out of the runner image so a missing
#   runtime secret fails loudly instead of using a dummy value.
# ──────────────────────────────────────────────────────────────
FROM base AS build-base
ENV DATABASE_URL="postgresql://build_only:build_only@localhost:5432/build_only" \
    NEXTAUTH_SECRET="dummy_secret_for_build_stability" \
    NEXTAUTH_URL="http://localhost:3000"

# ──────────────────────────────────────────────────────────────
# STAGE 2: deps
#   Install npm packages with exact lock file.
# ──────────────────────────────────────────────────────────────
FROM build-base AS deps

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# --legacy-peer-deps required for Mantine/Next.js dependency tree
# --ignore-scripts prevents postinstall scripts from running as root
# Using npm install instead of ci because local package-lock.json may drift
RUN npm install --legacy-peer-deps --ignore-scripts && \
    # Run Prisma generate explicitly (was blocked by --ignore-scripts)
    npx prisma generate

# ──────────────────────────────────────────────────────────────
# STAGE 3: builder
#   Compile the Next.js application.
# ──────────────────────────────────────────────────────────────
FROM build-base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Increase V8 heap for the build process to prevent OOM
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ──────────────────────────────────────────────────────────────
# STAGE 4: runner  ← final production image
# ──────────────────────────────────────────────────────────────
FROM base AS runner

# ── Final Runtime Environment ──────────────────────────────────
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    # V8 heap cap: leaves room for Chromium (PDF generation) under the 2G container limit
    NODE_OPTIONS="--max-old-space-size=1024" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    # Avoid --single-process: often worsens CPU churn; shm_size in compose helps.
    CHROMIUM_FLAGS="--headless=new --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu --disable-extensions --mute-audio"

# Install Chromium only in the final stage
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Non-root user setup
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --no-create-home nextjs

# Copy artifacts from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# standalone output includes node_modules and manifest
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Persistence/Cache dirs. public/uploads is a mounted volume in compose; creating it here
# (owned by nextjs) makes the fresh named volume inherit writable ownership.
RUN mkdir -p .next public/uploads && chown nextjs:nodejs .next public/uploads

EXPOSE 3000

USER nextjs

ENTRYPOINT ["tini", "--", "node", "server.js"]
