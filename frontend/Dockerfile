FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# NEXT_PUBLIC_API_URL 在构建时固定为生产域名
ARG NEXT_PUBLIC_API_URL=https://primercat.com/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── 运行阶段 ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN addgroup -g 1001 nodejs && adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
