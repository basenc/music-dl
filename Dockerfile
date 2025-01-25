FROM node:20-alpine AS build

ENV NEXT_TELEMETRY_DISABLED=1

# Install required packages
RUN apk add --no-cache libc6-compat bash

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

USER nextjs
WORKDIR /app

# Install dependencies and build
COPY --chown=1001:1001 package*.json ./
RUN npm ci
COPY --chown=1001:1001 . .
RUN npm run build

# Final stage
FROM node:20-alpine

ENV NEXT_TELEMETRY_DISABLED=1
ENV PATH="/home/nextjs/.local/bin:${PATH}"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Install required packages
RUN apk add --no-cache libc6-compat python3 py3-pip aria2 ffmpeg bash
RUN python3 -m pip install --upgrade --break-system-packages votify yt-dlp --no-cache-dir \
    && rm -rf /root/.cache/pip

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs

WORKDIR /app
COPY --chown=1001:1001 --from=build /app/.next ./.next
COPY --chown=1001:1001 --from=build /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=1001:1001 --from=build /app/server.js ./
COPY --chown=1001:1001 --from=build /app/public ./public

RUN mkdir -p /app/storage /app/output

EXPOSE 3000
CMD ["node", "server.js"]