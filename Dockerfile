FROM denoland/deno:latest AS build

WORKDIR /app

COPY --chown=deno:deno musicdl/ .
RUN deno cache main.ts

FROM denoland/deno:latest

RUN apt update && apt install -y python-is-python3 python3-pip aria2 ffmpeg \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install --upgrade --break-system-packages votify yt-dlp --no-cache-dir \
    && rm -rf /root/.cache/pip

WORKDIR /app

COPY --chown=1001:1001 --from=build /app .

EXPOSE 8000
CMD ["deno", "task", "start"]