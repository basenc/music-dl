const sockets = new Set<WebSocket>();

export const addSocket = (ws: WebSocket) => {
  sockets.add(ws);
  ws.addEventListener("close", () => sockets.delete(ws));
  ws.addEventListener("error", () => sockets.delete(ws));
};

export const broadcast = (
  data: string | ArrayBufferLike | Blob | ArrayBufferView,
) => {
  Array.from(sockets)
    .filter((ws) => ws.readyState === WebSocket.OPEN)
    .forEach((ws) => ws.send(data));
};
