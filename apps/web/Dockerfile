# Next.js web app in the pnpm monorepo.
# Single build image (install after copying source) — robust with pnpm's
# per-package node_modules symlinks. node_modules is provided by .dockerignore.
FROM node:20-slim AS build
RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @careeros/web build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@careeros/web", "start"]
