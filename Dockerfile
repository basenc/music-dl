#

FROM node:20-alpine AS build

ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat bash

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

USER nextjs
WORKDIR /app

COPY --chown=1001:1001 \
    package*.json \
    postcss.config.js \
    tailwind.config.js \
    tsconfig.json \
    tsconfig.server.json \
    next.config.ts \
    ./
RUN npm ci
COPY --chown=1001:1001 . .
RUN npm run build

#

FROM node:20-alpine

ENV NEXT_TELEMETRY_DISABLED=1
ENV PATH="/home/nextjs/.local/bin:${PATH}"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat python3 py3-pip aria2 ffmpeg bash
RUN python3 -m pip install --upgrade --break-system-packages votify yt-dlp --no-cache-dir \
    && rm -rf /root/.cache/pip

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs

WORKDIR /app

COPY --chown=1001:1001 --from=build /app/.next ./.next
COPY --chown=1001:1001 --from=build /app/package*.json ./
COPY --chown=1001:1001 --from=build /app/dist ./dist
COPY --chown=1001:1001 --from=build /app/public ./public

RUN npm ci --omit=dev && npm cache clean --force

RUN mkdir -p /app/storage /app/output

EXPOSE 3000
CMD ["npm", "start"]