import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SocketClient } from "@/platform/net/socket-client";
import { HandlerSwitch, HostLink } from "./host-link";
import { RETIRE_GIVE_UP_MS, RETIRE_RESEND_MS, RetireQueue, type Retire, type Retired } from "./retire-queue";

const ROOM = { code: "ABCD", token: "t".repeat(20) };
const alone = { instance: "a", shared: false };
const reply = (found: boolean, instance?: string): Retired => ({ type: "room:retired", code: "ABCD", found, ...(instance ? { instance } : {}) });

let sent: Retire[];
let asked: Retire[];
let answers: (Retired | null)[];

function makeQueue(courier = true): RetireQueue {
  const ask = async (message: Retire) => {
    asked.push(message);
    return answers.shift() ?? null;
  };
  return new RetireQueue((message) => sent.push(message), courier ? ask : null);
}

beforeEach(() => {
  vi.useFakeTimers();
  sent = [];
  asked = [];
  answers = [];
});
afterEach(() => vi.useRealTimers());

describe("RetireQueue", () => {
  it("is done when the room's own instance answers, found or not", () => {
    const queue = makeQueue();
    queue.add(ROOM, "WXYZ", alone);
    queue.confirm(reply(false, "a"));
    vi.advanceTimersByTime(RETIRE_RESEND_MS * 3);
    expect(sent).toHaveLength(1);
    expect(queue.pending()).toEqual([]);
  });

  it("keeps going over fresh connections when another instance has never heard of the room", async () => {
    const queue = makeQueue();
    queue.add(ROOM, "WXYZ", alone);
    answers.push(reply(false, "b"));
    queue.confirm(reply(false, "b"));
    // A fresh connection looks at once, then on the resend beat, never back to back.
    expect(asked).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(RETIRE_RESEND_MS - 1);
    expect(asked).toHaveLength(1);
    answers.push(reply(true, "a"));
    await vi.advanceTimersByTimeAsync(1);
    expect(asked).toHaveLength(2);
    expect(queue.pending()).toEqual([]);
    // The page's own socket, stuck on the other instance, is not asked again.
    expect(sent).toHaveLength(1);
  });

  it("takes any answer where every instance sees every room, or from an older relay", () => {
    const shared = makeQueue();
    shared.add(ROOM, undefined, { instance: "a", shared: true });
    shared.confirm(reply(false, "b"));
    expect(shared.pending()).toEqual([]);
    const old = makeQueue();
    old.add(ROOM, undefined, alone);
    old.confirm(reply(false));
    expect(old.pending()).toEqual([]);
    expect(asked).toEqual([]);
  });

  it("never spins without a courier, and gives up after a minute", async () => {
    const queue = makeQueue(false);
    queue.add(ROOM, undefined, alone);
    queue.confirm(reply(false, "b"));
    expect(sent).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(RETIRE_RESEND_MS);
    expect(sent).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(RETIRE_GIVE_UP_MS);
    const total = sent.length;
    await vi.advanceTimersByTimeAsync(RETIRE_RESEND_MS * 3);
    expect(sent).toHaveLength(total);
    expect(queue.pending()).toEqual([]);
  });
});

describe("HostLink.retireOld", () => {
  it("keeps sending the old room's retire until the old room's instance confirms", () => {
    const sends: unknown[] = [];
    let closed = 0;
    const heard: string[] = [];
    const fake = { send: (message: unknown) => sends.push(message), close: () => (closed += 1), connect: () => undefined, usesStream: false };
    const link = new HostLink(
      { onOpen: () => undefined, onMessage: (message) => heard.push(message.type), onStatus: () => undefined },
      () => fake as unknown as SocketClient,
    );
    const old = { client: fake as unknown as SocketClient, handlers: new HandlerSwitch({ onOpen: () => undefined, onMessage: () => undefined, onStatus: () => undefined }) };
    const retire: Retire = { type: "host:retire", ...ROOM, movedTo: "WXYZ" };
    link.retireOld(old, retire, alone);
    expect(sends).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    expect(sends).toHaveLength(3);
    old.handlers.onMessage(reply(false, "b"));
    expect(closed).toBe(0);
    old.handlers.onMessage(reply(true, "a"));
    expect(closed).toBe(1);
    expect(heard).toEqual(["room:retired", "room:retired"]);
    vi.advanceTimersByTime(10_000);
    expect(sends).toHaveLength(3);
  });
});
