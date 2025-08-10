import { Plugin } from "$fresh/server.ts";
import { dom } from "npm:@fortawesome/fontawesome-svg-core";

export default function fa(): Plugin {
  return {
    name: "fa",
    render(ctx) {
      const cssText = dom.css();
      const res = ctx.render();
      return {
        scripts: [],
        styles: [{ cssText, id: "font-awesome-svg-core-css" }],
      };
    },
  };
}
