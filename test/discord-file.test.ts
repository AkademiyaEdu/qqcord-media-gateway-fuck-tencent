import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Client, Collection, Events, GatewayIntentBits, type Message } from "discord.js";
import { MediaDatabase } from "../src/db.js";
import { createStorageServer } from "../src/server.js";
import { DiscordFileStore } from "../src/store/discord-file.js";
import { ImageStore } from "../src/store/image.js";
import { MediaStore } from "../src/store/media.js";

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address !== "string");
      resolve("http://127.0.0.1:" + address.port + "/");
    });
  });
}

test("Discord attachment registration uses one path and serves refreshed redirects", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "qqcord-discord-file-"));
  const db = new MediaDatabase(join(dir, "test.db"));
  const discord = new Client({ intents: [GatewayIntentBits.Guilds] });
  const files = new DiscordFileStore(discord, db, "bot-secret");
  const images = new ImageStore(join(dir, "images"), "https://media.example.com");
  const media = new MediaStore(db, "https://media.example.com", "http://onebot.invalid");
  const gateway = createStorageServer(images, media, "gateway-secret", files);
  const gatewayUrl = await listen(gateway);
  const nativeFetch = globalThis.fetch;
  const requests: string[] = [];
  const path = "1273112599885647883/1529321713723117578/b64tofile.cpp";
  const original = "https://cdn.discordapp.com/attachments/" + path;
  const signed = original + "?ex=6aeb4815&is=6ae9f695&hm=test";

  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input) === "https://discord.com/api/v9/attachments/refresh-urls") {
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bot bot-secret");
      const body = JSON.parse(String(init?.body)) as { attachment_urls: string[] };
      assert.deepEqual(body.attachment_urls, [original]);
      requests.push(original);
      return Response.json({ refreshed_urls: [{ original, refreshed: signed }] });
    }
    return nativeFetch(input, init);
  });

  try {
    const file = new URL("file/" + path, gatewayUrl);
    assert.equal((await fetch(file, { redirect: "manual" })).status, 404);
    assert.equal(requests.length, 0);

    const attachment = { url: original + "?ex=expired&is=old&hm=old" };
    const message = {
      attachments: new Collection([["1529321713723117578", attachment]]),
    } as unknown as Message;

    discord.emit(Events.MessageCreate, message);
    discord.emit(Events.MessageCreate, message);

    assert.equal((db.discordAttachmentByPath.get(path) as { path: string }).path, path);
    assert.equal(db.insertDiscordAttachment.run(path).changes, 0);

    const response = await fetch(file, { redirect: "manual" });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), signed);
    assert.equal(response.headers.get("cache-control"), "no-store");

    const head = await fetch(file, { method: "HEAD", redirect: "manual" });
    assert.equal(head.status, 302);
    assert.equal(head.headers.get("location"), signed);
    assert.equal(requests.length, 2);

    assert.equal((await fetch(new URL("file/127/456/unregistered.cpp", gatewayUrl), {
      redirect: "manual",
    })).status, 404);
    assert.equal(requests.length, 2);
  } finally {
    await new Promise<void>((resolve, reject) => {
      gateway.close((error) => error ? reject(error) : resolve());
    });
    discord.destroy();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
