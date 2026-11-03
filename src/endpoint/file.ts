import type { DiscordFileStore } from "../store/discord-file.js";
import { send } from "./common.js";
import type { EndpointHandler, Router } from "./router.js";

export function registerDiscordFileEndpoint(router: Router, files: DiscordFileStore): void {
  const redirectFile: EndpointHandler = async (req, res) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname.slice("/file/".length);

    try {
      const url = await files.getDownloadUrl(path);
      if (!url) {
        send(res, 404, "Not Found", { "cache-control": "no-store" });
        return;
      }

      send(res, 302, undefined, {
        location: url,
        "cache-control": "no-store",
      });
    } catch (error) {
      console.error("[file] failed to refresh " + path + ":", error);
      send(res, 502, "Discord attachment URL refresh failed", { "cache-control": "no-store" });
    }
  };

  router.get("/file/:channelId/:attachmentId/:filename", redirectFile);
  router.head("/file/:channelId/:attachmentId/:filename", redirectFile);
}
