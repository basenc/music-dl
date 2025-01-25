# syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base

ENV PATH="/root/.local/bin:${PATH}"
ENV NEXT_TELEMETRY_DISABLED=1
# ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat pipx aria2 ffmpeg
RUN pipx install votify yt-dlp

WORKDIR /app

COPY . .
RUN npm ci
RUN npm run build

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]