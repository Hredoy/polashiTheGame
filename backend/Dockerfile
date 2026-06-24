# Multi-stage build for the Polashi backend (Node + TypeScript, ESM).

# ---- build stage: compile TypeScript -> dist ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# schema.sql is read at runtime relative to dist/db; tsc only emits .ts, so copy it in.
RUN cp src/db/schema.sql dist/db/schema.sql

# ---- runtime stage: production deps only ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
# Env (DATABASE_URL, REDIS_URL, SESSION_SECRET, ...) is provided by the container runtime.
CMD ["node", "dist/index.js"]
