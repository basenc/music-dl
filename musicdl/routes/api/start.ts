import { Handlers } from "$fresh/server.ts";
import { type Task, Votify } from "../../lib/votify.ts";

export const handler: Handlers<Task> = {
  async POST(req) {
    const body = (await req.json()) as Task;
    await Votify.start({
      links: body.links ?? "",
      wvdData: body.wvdData ?? null,
      cookiesData: body.cookiesData ?? null,
    });
    return new Response(null, { status: 200 });
  },
};
