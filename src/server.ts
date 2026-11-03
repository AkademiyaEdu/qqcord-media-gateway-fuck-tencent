import { createServer } from "node:http";
import type { MediaStore } from "./store/media.js";
import type { ImageStore } from "./store/image.js";
import { registerHealthEndpoint } from "./endpoint/health.js";
import { registerImageEndpoint } from "./endpoint/image.js";
import { registerMediaEndpoint } from "./endpoint/media.js";
import { registerDiscordFileEndpoint } from "./endpoint/file.js";
import type { DiscordFileStore } from "./store/discord-file.js";
import { Router } from "./endpoint/router.js";

export function createStorageServer(images: ImageStore, media: MediaStore, apiToken: string, discordFiles?: DiscordFileStore) {
  const router = new Router();
  registerHealthEndpoint(router);
  registerImageEndpoint(router, images, apiToken);
  registerMediaEndpoint(router, media, apiToken);
  if (discordFiles) registerDiscordFileEndpoint(router, discordFiles);
  return createServer((req, res) => {
    void router.handle(req, res).catch((error) => {
      console.error("[http] request failed:", error);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });
  });
}
