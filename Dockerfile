# syntax=docker/dockerfile:1
# --------------------------------------------------------
# 1. Base Node Image
# --------------------------------------------------------
FROM node:22-alpine AS base
ENV CI=true

# --------------------------------------------------------
# 2. Dependencies Stage
# --------------------------------------------------------
FROM base AS deps
# libc6-compat is required by some Node native modules on Alpine
# openssl is required for Prisma
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# The user explicitly requires legacy-peer-deps for this project
RUN npm install --legacy-peer-deps

# --------------------------------------------------------
# 3. Builder Stage
# --------------------------------------------------------
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time env vars
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Re-generate Prisma Client to ensure architecture matches Alpine
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# --------------------------------------------------------
# 4. Production Runner Stage
# --------------------------------------------------------
FROM base AS runner
WORKDIR /app

# Install tini for proper application signal handling and zombie process reaping
RUN apk add --no-cache tini openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create highly secure non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy essential public facing assets
COPY --from=builder /app/public ./public

# Setup prerender cache directory with correct non-root ownership
RUN mkdir .next && chown nextjs:nodejs .next

# Leverage Next.js Standalone feature
# This traces dependencies & copies ONLY the required files & node_modules for production.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Restrict the container process to the non-root user
USER nextjs

EXPOSE 3000

# Use tini as the primary entrypoint for proper signal handling (e.g. SIGTERM, SIGINT)
ENTRYPOINT ["/sbin/tini", "--"]

# Execute the traced standalone server
CMD ["node", "server.js"]
