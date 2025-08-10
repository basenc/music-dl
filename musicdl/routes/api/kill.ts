import type { Handlers } from "$fresh/server.ts";
import { Votify } from "../../lib/votify.ts";

export const handler: Handlers = {
  POST() {
    Votify.stop();
    return new Response(null, { status: 200 });
  },
};
