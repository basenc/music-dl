.PHONY: build deploy
.DEFAULT_GOAL := main

build:
	podman build . -t cr.frogs.rocks/music_dl:latest
	podman push cr.frogs.rocks/music_dl:latest

deploy:
	DOCKER_HOST=ssh://root@frogs.rocks docker compose up -d --force-recreate --remove-orphans

logs:
	DOCKER_HOST=ssh://root@frogs.rocks docker compose logs -f --tail=100

main: build deploy logs