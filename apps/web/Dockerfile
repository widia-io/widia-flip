FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/web --workspace=packages/shared

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN rm -f .env.local && touch .env.local && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
