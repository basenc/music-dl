import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";
import fa from "./plugins/fa.ts";

export default defineConfig({
  plugins: [fa(), tailwind()],
});
