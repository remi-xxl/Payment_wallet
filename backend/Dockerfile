
# ── STAGE 1: BASE ─────────────────────────────────────────────

FROM node:20-alpine AS base

WORKDIR /app

# ── STAGE 2: DEPENDENCIES ─────────────────────────────────────
FROM base AS dependencies

COPY package*.json ./
COPY prisma ./prisma/


RUN npm ci --omit=dev


RUN npx prisma generate

# ── STAGE 3: PRODUCTION ───────────────────────────────────────
FROM base AS production


RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodejs -u 1001

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/node_modules/.prisma ./node_modules/.prisma


COPY . .

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000


CMD ["node", "src/server.js"]
