import type { Handlers } from "$fresh/server.ts";
import { addSocket } from "../../lib/ws.ts";

export const handler: Handlers = {
  GET(req) {
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.addEventListener("open", () => {
      socket.send("> Connected to server\n");
    });

    addSocket(socket);
    return response;
  },
};
