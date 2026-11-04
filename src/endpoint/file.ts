import type { DiscordFileStore } from "../store/discord-file.js";
import { send } from "./common.js";
import type { EndpointHandler, Router } from "./router.js";

export function registerDiscordFileEndpoint(router: Router, files: DiscordFileStore): void {
  const redirectFile: EndpointHandler = async (_req, res, { id }) => {

    try {
      const url = await files.getDownloadUrl(id);
      if (!url) {
        send(res, 404, "Not Found", { "cache-control": "no-store" });
        return;
      }

      send(res, 302, undefined, {
        location: url,
        "cache-control": "no-store",
      });
    } catch (error) {
      console.error("[file] failed to refresh " + id + ":", error);
      send(res, 502, "Discord attachment URL refresh failed", { "cache-control": "no-store" });
    }
  };

  router.get("/file/:id", redirectFile);
  router.head("/file/:id", redirectFile);
}
