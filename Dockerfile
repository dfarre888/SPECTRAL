# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# SPECTRAL — Multi-stage Docker build
# Target: AWS ECS Fargate / EKS (ap-southeast-2)
#
# Stages
#   deps     — production npm install only (smaller cache layer)
#   builder  — full install + Cesium copy + next build (standalone)
#   runner   — minimal Alpine image with only the built artefacts
#
# Cesium note:
#   copy-cesium-public.mjs copies Cesium assets to public/static/Cesium/
#   NEXT_PUBLIC_CESIUM_BASE_URL=/static/Cesium is baked at build time
#   The standalone server then serves /static/* from the public/ copy
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: production deps ──────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
# Install ALL deps (cesium, @aws-sdk, etc. required at build)
RUN npm ci

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Cesium static assets → public/static/Cesium (served at /static/Cesium in Helm)
# Must run before next build so the public/ tree is complete for standalone copy
RUN node scripts/copy-cesium-public.mjs

# CESIUM_BASE_URL for Helm / air-gap / Docker deployments
ENV NEXT_PUBLIC_CESIUM_BASE_URL=/static/Cesium

# Disable telemetry in CI
ENV NEXT_TELEMETRY_DISABLED=1

# Stub out secrets that are referenced as NEXT_PUBLIC_ at build time.
# Runtime secrets (SUPABASE keys, AWS credentials) are injected at container start
# via ECS task definition / Kubernetes Secret — NOT baked into the image.
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
ENV NEXT_PUBLIC_APP_URL=https://placeholder
ENV NEXT_PUBLIC_APP_ENV=production
ENV NEXT_PUBLIC_DEMO_MODE=false
ENV NEXT_PUBLIC_SPECTRAL_EDITION=operations

RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone bundle (server.js + node_modules subset)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Static chunks (_next/static — CSS, JS, fonts)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Public folder — includes /static/Cesium from copy-cesium-public.mjs
# Also includes brand assets, icons, etc.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Next.js standalone entrypoint
CMD ["node", "server.js"]
