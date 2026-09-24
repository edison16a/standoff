import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import type { ServerEnvelope } from "@/shared/protocol";
import { ROTATE_LEAD_MS } from "@/relay/relay-types";
import { GET } from "./route";

/**
 * Runs the real route and the real @vercel/functions upgrade helper. The
 * only stand in is the hook Vercel's runtime would provide: the raw
 * request, socket and head of the upgrade, plus the invocation deadline.
 */
const CONTEXT = Symbol.for("@vercel/request-context");
let server: Server;
let origin: string;
let deadlineIn = 60 * 60 * 1000;
const kept: Promise<unknown>[] = [];

function toRequest(req: IncomingMessage): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers.set(key, value);
  return new Request(`http://${req.headers.host}${req.url}`, { headers });
}

beforeAll(async () => {
  server = createServer((req, res) => {
    void GET(toRequest(req)).then(async (response) => res.writeHead(response.status).end(await response.text()));
  });
  server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const context = {
      upgradeWebSocket: () => ({ req, socket, head }),
      deadline: new Date(Date.now() + deadlineIn).toISOString(),
      waitUntil: (promise: Promise<unknown>) => kept.push(promise),
    };
    (globalThis as Record<symbol, unknown>)[CONTEXT] = { get: () => context };
    void GET(toRequest(req));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

/** A client socket that collects what the relay sends it. */
async function open() {
  const socket = new WebSocket(`ws://${origin}/api/ws`);
  const inbox: ServerEnvelope[] = [];
  socket.on("message", (data) => inbox.push(JSON.parse(String(data)) as ServerEnvelope));
  await new Promise((resolve) => socket.once("open", resolve));
  const waitFor = async <T extends ServerEnvelope["type"]>(type: T) => {
    for (let i = 0; i < 100; i++) {
      const found = inbox.find((m) => m.type === type);
      if (found) return found as Extract<ServerEnvelope, { type: T }>;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`no ${type} in ${JSON.stringify(inbox)}`);
  };
  return { socket, inbox, waitFor, send: (message: unknown) => socket.send(JSON.stringify(message)) };
}

describe("the Vercel WebSocket route", () => {
  it("refuses a plain GET", async () => {
    const response = await fetch(`http://${origin}/api/ws`);
    expect(response.status).toBe(426);
  });

  it("hosts a room and relays between host and phone", async () => {
    const host = await open();
    // Sent straight after open, which is exactly what must not be lost.
    host.send({ type: "host:create" });
    const created = await host.waitFor("room:created");
    expect(created.joinUrl).toBe(`https://${origin}/join/${created.code}`);

    const phone = await open();
    phone.send({ type: "phone:join", code: created.code });
    expect((await phone.waitFor("phone:joined")).slot).toBe(1);
    phone.send({ type: "phone:send", payload: { kind: "strike", action: "jab" } });
    expect((await host.waitFor("peer:message")).payload).toEqual({ kind: "strike", action: "jab" });
    expect(kept.length).toBeGreaterThanOrEqual(2);
    host.socket.close();
    phone.socket.close();
  });

  it("asks the client to move before the deadline", async () => {
    deadlineIn = ROTATE_LEAD_MS + 50;
    const client = await open();
    await client.waitFor("server:rotate");
    client.socket.close();
    deadlineIn = 60 * 60 * 1000;
  });
});
