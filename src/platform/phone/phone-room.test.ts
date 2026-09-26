// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { PhoneApp } from "./components/PhoneApp";
import { PhoneRoom } from "./phone-room";

const audio = vi.hoisted(() => ({ closes: 0 }));
vi.mock("@/platform/audio/audio-engine", () => ({
  AudioEngine: class {
    async unlock() {}
    close() {
      audio.closes += 1;
    }
  },
}));
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
// The header's buttons are beside the point here.
vi.mock("@/components/ui/HomeLink", () => ({ HomeLink: () => null }));
vi.mock("@/components/ui/GitHubButton", () => ({ GitHubButton: () => null }));
vi.mock("@/components/ui/ThemeToggle", () => ({ ThemeToggle: () => null }));
// One tiny game, and nothing else this build knows.
vi.mock("@/games/catalog", () => ({
  loadGame: (id: string) =>
    id === "tiny" ? Promise.resolve({ createPhone: () => ({ Screen: () => "Tiny game", dispose() {} }) }) : null,
}));

/** Just enough of a browser WebSocket to play the relay by hand. */
class FakeSocket {
  static all: FakeSocket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  readonly sent: ClientEnvelope[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  constructor() {
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data) as ClientEnvelope);
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
}

const last = () => FakeSocket.all.at(-1)!;
const joined = (code: string, game: string): ServerEnvelope => ({ type: "phone:joined", code, game, seats: 2, seat: 1, token: "t".repeat(20), hostHere: true });

beforeEach(() => {
  FakeSocket.all = [];
  audio.closes = 0;
  vi.stubGlobal("WebSocket", FakeSocket);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PhoneRoom", () => {
  it("stops for good once a join cannot find the room, rather than rejoining it on every drop", async () => {
    vi.useFakeTimers();
    const room = new PhoneRoom("ABCD");
    await room.join(null);
    // The first try and six fresh sockets all miss.
    for (let i = 0; i < 7; i++) {
      last().open();
      last().receive({ type: "room:error", reason: "not-found" });
    }
    expect(FakeSocket.all).toHaveLength(7);
    // Whether the phone closed it or the relay's miss cap did, nothing dials again.
    last().close(1008);
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.all).toHaveLength(7);
    expect(last().readyState).toBe(3);
  });

  it("closes its sound once when a room that ended is disposed again by its page", async () => {
    const room = new PhoneRoom("EFGH");
    await room.join(null);
    last().open();
    last().receive(joined("EFGH", "tiny"));
    last().receive({ type: "room:closed" });
    room.dispose();
    expect(audio.closes).toBe(1);
  });
});

describe("PhoneApp", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const show = (code: string) => act(() => root.render(createElement(PhoneApp, { code })));
  const text = () => host.textContent ?? "";
  const button = (label: string) => [...host.querySelectorAll("button")].find((each) => each.textContent?.includes(label));

  /** Taps Skip, then lets the socket open and the relay answer. */
  async function joinWith(...replies: ServerEnvelope[]) {
    await act(async () => button("Skip")!.click());
    await act(async () => {
      last().open();
      for (const reply of replies) last().receive(reply);
    });
  }

  it("starts the next room at the name screen, not where the last one ended", async () => {
    show("AAAA");
    await joinWith(joined("AAAA", "tiny"), { type: "room:closed" });
    expect(text()).toContain("The game has ended");
    // The same tab moves on to the host's next room, as Back or a link would take it.
    act(() => root.unmount());
    root = createRoot(host);
    show("BBBB");
    expect(text()).toContain("Room BBBB");
    expect(text()).not.toContain("The game has ended");
  });

  it("joins the room it now shows when the code changes in place", async () => {
    show("AAAA");
    show("BBBB");
    await joinWith();
    expect(last().sent[0]).toMatchObject({ type: "phone:join", code: "BBBB" });
  });

  it("moves on to the code typed on the ended screen instead of reloading the dead room", async () => {
    show("CCCC");
    await joinWith(joined("CCCC", "tiny"), { type: "room:closed" });
    expect(button("Try again")).toBeUndefined();
    const input = host.querySelector("input")!;
    act(() => {
      // React only hears a value set the way a keyboard sets it.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "wxyz");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => button("Join")!.click());
    expect(navigation.push).toHaveBeenCalledWith("/join/WXYZ");
  });

  it("says the game did not load instead of Loading forever", async () => {
    show("DDDD");
    await joinWith(joined("DDDD", "unknown-game"));
    await act(async () => undefined);
    expect(text()).toContain("The game did not load");
    expect(button("Try again")).toBeDefined();
  });
});
