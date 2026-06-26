# syntax=docker/dockerfile:1
# MONOREPO DOCKER PATTERN
# Build context is the monorepo root (set in docker-compose.yml).
# To add a new shared package from /packages/:
#   1. Add its package.json COPY in the deps stage
#   2. Add --workspace=packages/NEW_PACKAGE to npm ci in deps stage
#   3. Add a builder stage for it (copy source + run build)
#   4. Copy its dist/ and package.json in the production stage
# This pattern requires zero Dockerfile changes for business logic updates.

FROM node:20-alpine AS base
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/scoring/package.json ./packages/scoring/
RUN npm ci --workspace=@cyberxscore/api --workspace=@cyberxscore/scoring \
    --include-workspace-root

# Stage 2: Build scoring package
FROM deps AS scoring-builder
COPY packages/scoring ./packages/scoring
RUN npm run build --workspace=@cyberxscore/scoring

# Stage 3: Build API (prisma generate + nest build)
FROM scoring-builder AS api-builder
COPY apps/api ./apps/api
RUN cd apps/api && npx prisma generate
RUN npm run build --workspace=@cyberxscore/api

# Stage 4: Production image (minimal)
FROM node:20-alpine AS production
RUN apk add --no-cache wget
WORKDIR /app
ENV NODE_ENV=production

# node_modules from api-builder (includes prisma generate output in .prisma/client/)
COPY --from=api-builder /app/node_modules ./node_modules
COPY --from=deps /app/packages/scoring/package.json ./packages/scoring/
COPY --from=scoring-builder /app/packages/scoring/dist ./packages/scoring/dist
COPY --from=api-builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/package.json ./apps/api/
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

WORKDIR /app/apps/api
EXPOSE 3001
ENTRYPOINT ["/app/docker-entrypoint.sh"]
