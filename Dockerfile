# syntax=docker/dockerfile:1

# ── Build: compile the SPA ──────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ── Runtime: Express serves dist/ and the Gemini proxy ──────────────────
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server.ts ./
COPY src/lib/rateLimit.ts ./src/lib/rateLimit.ts
USER node
EXPOSE 8080
# Node 24 runs TypeScript directly (type stripping); no build step for the server.
CMD ["node", "server.ts", "--production"]
