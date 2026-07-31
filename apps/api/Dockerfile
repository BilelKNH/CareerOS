# NestJS API in the pnpm monorepo.
# Single build image (install after copying source) — robust with pnpm's
# per-package node_modules symlinks. node_modules is provided by .dockerignore.
FROM node:20-slim AS build
RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile=false
# Dummy URL just so `prisma generate` can resolve the datasource at build time.
# Overridden at runtime by docker-compose env_file.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN pnpm --filter @careeros/database exec prisma generate
RUN pnpm --filter @careeros/api build

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
