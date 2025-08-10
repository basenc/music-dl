FROM denoland/deno:alpine AS build

WORKDIR /app

COPY --chown=deno:deno musicdl/ .
RUN deno cache main.ts

FROM denoland/deno:alpine

RUN apk add --no-cache python3 py3-pip aria2 ffmpeg
RUN python3 -m pip install --upgrade --break-system-packages votify yt-dlp --no-cache-dir \
    && rm -rf /root/.cache/pip

WORKDIR /app

COPY --chown=1001:1001 --from=build /app .

EXPOSE 8000
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-run", "--allow-env", "--allow-plugin", "main.ts"]