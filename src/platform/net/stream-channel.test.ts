import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOSSY_GAP_MS, POST_GAP_MS, SILENT_MS, StreamChannel } from "./stream-channel";

/** An event stream the test opens by hand. */
class FakeSource {
  static last: FakeSource;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  private readonly listeners = new Map<string, (event: MessageEvent<string>) => void>();
  constructor() {
    FakeSource.last = this;
  }
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.set(type, listener);
  }
  hello() {
    this.emit("hello", "id");
  }
  emit(type: string, data = "") {
    this.listeners.get(type)?.({ data } as MessageEvent<string>);
  }
  close() {}
}

let bodies: string[];
let statuses: number[];

function openChannel(): StreamChannel {
  const channel = new StreamChannel();
  FakeSource.last.hello();
  return channel;
}

/** Lets pending fetches resolve. */
async function settle() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe("StreamChannel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    bodies = [];
    statuses = [];
    vi.stubGlobal("EventSource", FakeSource);
    vi.stubGlobal("CloseEvent", class extends Event {});
    vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
      bodies.push(init.body);
      return { status: statuses.shift() ?? 204 };
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("spaces its posts out and batches what queued meanwhile", async () => {
    const channel = openChannel();
    channel.send('{"n":1}');
    await settle();
    for (let n = 2; n <= 6; n++) channel.send(`{"n":${n}}`);
    await settle();
    expect(bodies).toEqual(['[{"n":1}]']);
    vi.advanceTimersByTime(POST_GAP_MS);
    await settle();
    expect(bodies).toEqual(['[{"n":1}]', '[{"n":2},{"n":3},{"n":4},{"n":5},{"n":6}]']);
    expect(channel.posts).toBe(2);
  });

  it("keeps only the newest waiting frame of a kind", async () => {
    const channel = openChannel();
    channel.send('{"first":true}');
    await settle();
    channel.send('{"motion":1}', "motion");
    channel.send('{"strike":1}');
    channel.send('{"motion":2}', "motion");
    vi.advanceTimersByTime(POST_GAP_MS);
    await settle();
    expect(bodies[1]).toBe('[{"strike":1},{"motion":2}]');
  });

  it("lets motion frames wait longer than inputs, which take them along", async () => {
    const channel = openChannel();
    channel.send('{"first":true}');
    await settle();
    channel.send('{"motion":1}', "motion");
    vi.advanceTimersByTime(POST_GAP_MS);
    await settle();
    expect(bodies).toHaveLength(1);
    vi.advanceTimersByTime(LOSSY_GAP_MS - POST_GAP_MS);
    await settle();
    expect(bodies[1]).toBe('[{"motion":1}]');
    channel.send('{"motion":2}', "motion");
    vi.advanceTimersByTime(POST_GAP_MS);
    channel.send('{"strike":1}');
    await settle();
    expect(bodies[2]).toBe('[{"motion":2},{"strike":1}]');
  });

  it("gives up on a stream that has gone silent, but not on one the relay pings", () => {
    const closed = vi.fn();
    const channel = openChannel();
    channel.onclose = closed;
    const source = FakeSource.last;
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(15_000);
      source.emit("ping");
    }
    expect(closed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SILENT_MS + 10_000);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("tries a misrouted post again at once, then gives up on the stream", async () => {
    const closed = vi.fn();
    const channel = openChannel();
    channel.onclose = closed;
    statuses = [410, 410, 204];
    channel.send("{}");
    await settle();
    expect(bodies).toHaveLength(3);
    expect(closed).not.toHaveBeenCalled();
    statuses = Array.from({ length: 6 }, () => 410);
    vi.advanceTimersByTime(POST_GAP_MS);
    channel.send("{}");
    for (let i = 0; i < 6; i++) await settle();
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
