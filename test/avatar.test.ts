import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { Events, type Client } from "discord.js";
import { AvatarStore } from "../src/store/avatar.js";
import type { MediaDatabase } from "../src/db.js";

test("saves bot and interaction invoker avatars without blocking message handling", (t) => {
  const client = new EventEmitter();
  const store = new AvatarStore("", {} as MediaDatabase, client as unknown as Client, "relay-channel");
  const saved: string[] = [];

  t.mock.method(store, "save", async (user) => {
    saved.push(user.id);
  });

  client.emit(Events.MessageCreate, {
    channelId: "relay-channel",
    author: { id: "bot" },
    interactionMetadata: { user: { id: "invoker" } },
  });
  assert.deepEqual(saved, ["bot", "invoker"]);

  client.emit(Events.MessageCreate, {
    channelId: "relay-channel",
    author: { id: "ordinary-user" },
  });
  assert.deepEqual(saved, ["bot", "invoker", "ordinary-user"]);

  client.emit(Events.MessageCreate, {
    channelId: "other-channel",
    author: { id: "other-bot" },
    interactionMetadata: { user: { id: "other-invoker" } },
  });
  assert.deepEqual(saved, ["bot", "invoker", "ordinary-user"]);
});

test("saves a legacy interaction invoker using the same avatar store", (t) => {
  const client = new EventEmitter();
  const store = new AvatarStore("", {} as MediaDatabase, client as unknown as Client, "relay-channel");
  const saved: string[] = [];
  t.mock.method(store, "save", async (user) => {
    saved.push(user.id);
  });

  client.emit(Events.MessageCreate, {
    channelId: "relay-channel",
    author: { id: "bot" },
    interaction: { user: { id: "legacy-invoker" } },
  });
  assert.deepEqual(saved, ["bot", "legacy-invoker"]);
});
