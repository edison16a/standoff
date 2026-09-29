// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HostRoom } from "../host-room";
import { useHostStore, type RoomHealth } from "../host-store";
import { HostContext } from "./host-context";
import { JoinPanel } from "./JoinPanel";
import { RoomAlert } from "./RoomAlert";

vi.mock("qrcode", () => ({ toString: async () => "<svg data-qr></svg>" }));

const regenerate = vi.fn();
const keepRoom = vi.fn();
const fakeHost = { regenerate, keepRoom, leave: vi.fn() } as unknown as HostRoom;
let container: HTMLDivElement;
let root: Root;

async function show(health: RoomHealth, extra: Partial<ReturnType<typeof useHostStore.getState>> = {}) {
  useHostStore.setState({
    room: { code: "ABCD", joinUrl: "https://x/join/ABCD", game: "tiny", seats: 4 },
    players: [1, 2, 3, 4].map((seat) => ({ seat, name: `Player ${seat}`, connected: false })),
    playing: false,
    health,
    ...extra,
  });
  await act(async () =>
    root.render(
      <HostContext.Provider value={fakeHost}>
        <JoinPanel title="Tiny" />
        <RoomAlert />
      </HostContext.Provider>,
    ),
  );
}

const text = () => container.textContent ?? "";

describe("JoinPanel", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    regenerate.mockClear();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows no QR code and no code while the room is checked", async () => {
    await show("checking");
    expect(container.querySelector("[data-qr]")).toBeNull();
    expect(container.querySelector(".join__code")).toBeNull();
    expect(text()).toContain("Checking the room");
  });

  it("shows the code once the check passed, with Regenerate room right under it", async () => {
    await show("ok");
    expect(container.querySelector("[data-qr]")).not.toBeNull();
    const code = container.querySelector(".join__code")!;
    expect(code.textContent).toBe("ABCD");
    const button = container.querySelector<HTMLButtonElement>(".join__regen")!;
    expect(code.nextElementSibling).toBe(button);
    act(() => button.click());
    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  it("locks the button while a new room is made", async () => {
    await show("fixing");
    const button = container.querySelector<HTMLButtonElement>(".join__regen")!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Making a new room");
    expect(container.querySelector("[data-qr]")).toBeNull();
  });

  it("takes over the screen when a room with players in it is lost", async () => {
    await show("lost", { problem: "lost", roomGone: true });
    expect(container.querySelector("[data-qr]")).toBeNull();
    expect(text()).toContain("This room was lost");
    const big = container.querySelector<HTMLButtonElement>(".room-alert .btn--primary")!;
    act(() => big.click());
    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  it("offers to keep a room phones cannot reach, since the players in it still play", async () => {
    await show("lost", { problem: "unreachable", roomGone: false });
    expect(text()).toContain("Phones can't reach this room");
    const keep = [...container.querySelectorAll("button")].find((each) => each.textContent === "Keep this room")!;
    act(() => keep.click());
    expect(keepRoom).toHaveBeenCalledTimes(1);
  });
});
