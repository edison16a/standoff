import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { SocketClient, type SocketStatus } from "./socket-client";

/** Just enough of a browser WebSocket to drive the client by hand. */
class FakeSocket {
  static all: FakeSocket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  readonly sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;

  constructor() {
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code = 1000) {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code });
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: ServerEnvelope) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  types() {
    return this.sent.map((data) => (JSON.parse(data) as ClientEnvelope).type);
  }
}

const JAB: ClientEnvelope = { type: "phone:send", payload: { kind: "strike", action: "jab" } };
const MOTION: ClientEnvelope = { type: "phone:send", payload: { kind: "motion", pitch: 0, yaw: 0, roll: 0, move: 0 } };

let statuses: SocketStatus[];

function start() {
  statuses = [];
  const client = new SocketClient({
    onOpen: (send) => send({ type: "phone:join", code: "ABCD", token: "t" }),
    onMessage: () => undefined,
    onStatus: (status) => statuses.push(status),
  });
  client.connect();
  const first = FakeSocket.all[0]!;
  first.open();
  first.receive({ type: "phone:joined", code: "ABCD", game: "blade-clash", seats: 2, seat: 1, token: "t", hostHere: true });
  // The server asks for a handover, and the client dials a second socket.
  first.receive({ type: "server:rotate" });
  return { client, first, second: FakeSocket.all[1]! };
}

describe("SocketClient handover", () => {
  beforeEach(() => {
    FakeSocket.all = [];
    Object.assign(globalThis, { WebSocket: FakeSocket, location: { protocol: "https:", host: "game.test" } });
  });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "location");
  });

  it("sends again on the old socket what went out on a new one that never confirmed", () => {
    const { client, first, second } = start();
    second.open();
    client.send(JAB);
    expect(second.types()).toEqual(["phone:join", "phone:send"]);
    second.receive({ type: "room:error", reason: "unavailable" });
    expect(first.types()).toEqual(["phone:join", "phone:send"]);
  });

  it("reconnects after a kick its own dead handover socket caused", () => {
    const { first, second } = start();
    second.open();
    second.close(1006);
    first.close(4000);
    expect(statuses).not.toContain("replaced");
    expect(statuses.at(-1)).toBe("reconnecting");
  });

  it("drops motion when the socket it will really use is backed up", () => {
    const { client, first } = start();
    first.bufferedAmount = 100_000;
    client.sendLossy(MOTION);
    expect(first.types()).toEqual(["phone:join"]);
  });
});
