// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { PhoneApp } from "./components/PhoneApp";
import { webSocketOpened } from "@/platform/net/transport-choice";
import { PhoneRoom } from "./phone-room";

const audio = vi.hoisted(() => ({ closes: 0 }));
vi.mock("@/platform/audio/audio-engine", () => ({
  AudioEngine: class {
    ctx = Object.assign(new EventTarget(), { state: "running", resume: async () => {} });
    async unlock() {}
    close() {
      audio.closes += 1;
    }
  },
}));
const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
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
const joined = (code: string, game: string, name = "Player 1"): ServerEnvelope => ({ type: "phone:joined", code, game, seats: 2, seat: 1, token: "t".repeat(20), hostHere: true, name });

/** An event stream that never opens, for a WebSocket that falls back. */
class QuietSource {
  addEventListener() {}
  close() {}
}

beforeEach(() => {
  FakeSocket.all = [];
  audio.closes = 0;
  webSocketOpened();
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.stubGlobal("EventSource", QuietSource);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PhoneRoom", () => {
  it("tries a missing room a few more times, spaced out, then stops for good", async () => {
    vi.useFakeTimers();
    const room = new PhoneRoom("ABCD");
    await room.join(null);
    for (let i = 0; i < 5; i++) {
      last().open();
      last().receive({ type: "room:error", reason: "not-found" });
      // Never an instant redial: the next socket waits its turn.
      expect(FakeSocket.all).toHaveLength(i + 1);
      vi.advanceTimersByTime(4000);
    }
    expect(FakeSocket.all).toHaveLength(5);
    expect(room.store.getState()).toMatchObject({ stage: "error", error: "not-found" });
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.all).toHaveLength(5);
    expect(last().readyState).toBe(3);
  });

  it("keeps a seated phone's game while it tries to get back in, then says the room was lost", async () => {
    vi.useFakeTimers();
    const room = new PhoneRoom("ABCD");
    await room.join(null);
    last().open();
    last().receive(joined("ABCD", "tiny"));
    last().close(1006);
    for (let i = 0; i < 12 && room.store.getState().stage !== "error"; i++) {
      vi.advanceTimersByTime(4000);
      last().open();
      last().receive({ type: "room:error", reason: "not-found" });
      if (room.store.getState().stage !== "error") expect(room.store.getState()).toMatchObject({ stage: "playing", rejoining: true });
    }
    expect(room.store.getState()).toMatchObject({ stage: "error", error: "lost" });
  });

  it("says the room was lost when its host never came back", async () => {
    const room = new PhoneRoom("ABCD");
    await room.join(null);
    last().open();
    last().receive(joined("ABCD", "tiny"));
    last().receive({ type: "room:closed", lost: true });
    expect(room.store.getState()).toMatchObject({ stage: "error", error: "lost" });
  });

  it("follows a move that answers its join", async () => {
    const room = new PhoneRoom("ABCD");
    await room.join(null);
    last().open();
    last().receive({ type: "room:moved", code: "WXYZ" });
    expect(room.store.getState().movedTo).toBe("WXYZ");
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
    navigation.push.mockClear();
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

  /** Types a code on the ended screen and taps Join. */
  async function typeCode(value: string) {
    const input = host.querySelector("input")!;
    act(() => {
      // React only hears a value set the way a keyboard sets it.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => button("Join")!.click());
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

  it("says plainly when the room was lost, with the code field ready for the new one", async () => {
    show("LLLL");
    await joinWith(joined("LLLL", "tiny"), { type: "room:closed", lost: true });
    expect(text()).toContain("The room was lost");
    expect(text()).toContain("Join the new room");
    expect(host.querySelector("input")).not.toBeNull();
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
    await typeCode("wxyz");
    expect(navigation.push).toHaveBeenCalledWith("/join/WXYZ");
  });

  it("starts the room over when its own code is typed again, since the same page would change nothing", async () => {
    show("EEEE");
    await joinWith(joined("EEEE", "tiny"), { type: "room:closed" });
    await typeCode("eeee");
    expect(navigation.push).not.toHaveBeenCalled();
    expect(text()).toContain("Room EEEE");
    await joinWith();
    expect(last().sent[0]).toMatchObject({ type: "phone:join", code: "EEEE" });
  });

  it("says nothing about reconnecting while a first join falls back to the stream", async () => {
    show("FFFF");
    await act(async () => button("Skip")!.click());
    // A WebSocket that never opens, as Chrome's does on Vercel.
    act(() => last().close(1006));
    expect(text()).toContain("Joining room FFFF");
    expect(host.querySelector(".phone__notice")).toBeNull();
  });

  it("follows the host to a remade lobby and joins it without the name screen", async () => {
    show("GGGG");
    await joinWith(joined("GGGG", "tiny"));
    await act(async () => last().receive({ type: "room:moved", code: "HHHH" }));
    expect(navigation.replace).toHaveBeenCalledWith("/join/HHHH");
    expect(text()).toContain("Moving to the new room");
    // The router then shows the new code in the same page.
    show("HHHH");
    await act(async () => undefined);
    await act(async () => last().open());
    expect(last().sent[0]).toMatchObject({ type: "phone:join", code: "HHHH" });
    expect(button("Skip")).toBeUndefined();
  });

  it("says the game did not load instead of Loading forever", async () => {
    show("DDDD");
    await joinWith(joined("DDDD", "unknown-game"));
    await act(async () => undefined);
    expect(text()).toContain("The game did not load");
    expect(button("Try again")).toBeDefined();
  });

  it("moves to the player's own address once seated, without leaving the page", async () => {
    show("GGGG");
    await joinWith(joined("GGGG", "tiny", "Mary Jo"));
    expect(window.location.pathname).toBe("/play/GGGG/Mary%20Jo");
    expect(FakeSocket.all).toHaveLength(1);
  });
});
