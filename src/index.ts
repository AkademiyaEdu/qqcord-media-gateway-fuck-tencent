import { mkdir } from "node:fs/promises";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import { MediaDatabase } from "./db.js";
import { AvatarStore } from "./store/avatar.js";
import { DiscordFileStore } from "./store/discord-file.js";
import { MediaStore } from "./store/media.js";
import { ImageStore } from "./store/image.js";
import { createStorageServer } from "./server.js";

await Promise.all([
  mkdir(config.storage.avatarDir, { recursive: true }),
  mkdir(config.storage.imageDir, { recursive: true }),
]);

const db = new MediaDatabase(config.db.path);
const discord = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});
discord.once(Events.ClientReady, (ready) => {
  console.log(`[discord] ${ready.user.tag}`);
});
const avatars = new AvatarStore(config.storage.avatarDir, db, discord, config.discord.channelId);
const discordFiles = new DiscordFileStore(discord, db, config.discord.token);
const images = new ImageStore(config.storage.imageDir, config.storage.publicBaseUrl);
const media = new MediaStore(
  db,
  config.storage.publicBaseUrl,
  config.onebot.url,
  config.onebot.accessToken,
);
const server = createStorageServer(images, media, config.storage.apiToken, discordFiles);

server.listen(config.http.port, config.http.host, () => {
  console.log(`[http] http://${config.http.host}:${config.http.port}`);
});

await discord.login(config.discord.token);

function stop(): void {
  server.close();
  discord.destroy();
  db.close();
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
