import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";
import fa from "./plugins/fa.ts";

export default defineConfig({
  server: {
    port: parseInt(Deno.env.get("PORT") ?? "8000"),
    hostname: Deno.env.get("HOST") ?? "0.0.0.0",
  },
  plugins: [fa(), tailwind()],
});
