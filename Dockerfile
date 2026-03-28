FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
# Install OpenSSL 1.1 from Alpine 3.16 repo (last version with openssl1.1-compat)
RUN apk add --no-cache --repository=http://dl-cdn.alpinelinux.org/alpine/v3.16/main openssl1.1-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
