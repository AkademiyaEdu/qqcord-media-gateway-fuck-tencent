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
      const url = new URL(attachment.url);
      url.search = "";
      url.hash = "";
      this.db.insertDiscordAttachment.run(attachment.id, url.toString());
    }
  }

  async getDownloadUrl(id: string): Promise<string | null> {
    const attachment = this.db.discordAttachmentById.get(id) as { url: string } | undefined;
    if (!attachment) return null;

    const originalUrl = attachment.url;
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
