import { Events, type Client, type Message } from "discord.js";
import type { MediaDatabase } from "../db.js";

export class DiscordFileStore {
  constructor(
    client: Client,
    private readonly db: MediaDatabase,
    private readonly token: string,
  ) {
    client.on(Events.MessageCreate, (message) => this.handleMessageCreate(message));
  }

  private handleMessageCreate(message: Message): void {
    for (const attachment of message.attachments.values()) {
      const path = new URL(attachment.url).pathname.slice("/attachments/".length);
      this.db.insertDiscordAttachment.run(path);
    }
  }

  async getDownloadUrl(path: string): Promise<string | null> {
    if (!this.db.discordAttachmentByPath.get(path)) return null;

    const originalUrl = "https://cdn.discordapp.com/attachments/" + path;
    const response = await fetch("https://discord.com/api/v9/attachments/refresh-urls", {
      method: "POST",
      headers: {
        authorization: "Bot " + this.token,
        "content-type": "application/json",
      },
      body: JSON.stringify({ attachment_urls: [originalUrl] }),
    });

    if (!response.ok) {
      throw new Error("Discord attachment refresh failed: HTTP " + response.status);
    }

    const data = await response.json() as {
      refreshed_urls: { original: string; refreshed: string }[];
    };
    return data.refreshed_urls[0].refreshed;
  }
}
