# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/design-tokens/package.json ./packages/design-tokens/package.json
RUN npm ci

FROM dependencies AS build
COPY apps/api ./apps/api
RUN npm run build --workspace @travessia/api

FROM base AS production-dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/design-tokens/package.json ./packages/design-tokens/package.json
RUN npm ci --omit=dev --workspace @travessia/api --include-workspace-root=false

FROM base AS runtime
ENV NODE_ENV=production API_HOST=0.0.0.0 PORT=3001
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node apps/api/prisma ./apps/api/prisma
COPY --chown=node:node apps/api/package.json ./apps/api/package.json
COPY --chown=node:node package.json ./package.json
USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
