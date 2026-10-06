// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PhoneState } from "../../protocol";
import type { KartPhone } from "../kart-phone";
import { PowerButton } from "./PowerButton";
import { ControllerContext } from "./session-context";

const useItem = vi.fn();
const session = { useItem } as unknown as KartPhone;
let container: HTMLDivElement;
let root: Root;

const RACING: PhoneState = {
  kind: "state",
  phase: "racing",
  map: "beach",
  taken: [],
  pick: "blaze",
  ready: true,
  racing: true,
  countdown: null,
  place: 2,
  karts: 4,
  lap: 1,
  laps: 2,
  item: null,
  rolling: false,
  next: null,
  nextRolling: false,
  uses: 0,
  wrongWay: false,
  finished: false,
  effect: null,
  surge: 0,
  drift: null,
};

async function show(patch: Partial<PhoneState>) {
  await act(async () =>
    root.render(
      <ControllerContext.Provider value={session}>
        <PowerButton host={{ ...RACING, ...patch }} />
      </ControllerContext.Provider>,
    ),
  );
}

const button = () => container.querySelector<HTMLButtonElement>(".mk-power__button")!;
const sliding = () => container.querySelector(".mk-power__icon--slide") !== null;

describe("the power up button with a queued item", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    useItem.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows the queued item small behind the big one, tagged as next", async () => {
    await show({ item: "nitro", next: "orb" });
    expect(container.querySelector(".mk-power__next--full")).not.toBeNull();
    expect(container.querySelector(".mk-power__next-tag")?.textContent).toBe("Next");
    expect(button().getAttribute("aria-label")).toBe("Use Nitro. Star Orb is next");
    expect(container.querySelector(".mk-power__name")?.textContent).toBe("Nitro");
  });

  it("keeps an empty queued slot faint, with no tag", async () => {
    await show({ item: "nitro" });
    expect(container.querySelector(".mk-power__next")).not.toBeNull();
    expect(container.querySelector(".mk-power__next--full")).toBeNull();
    expect(container.querySelector(".mk-power__next-tag")).toBeNull();
  });

  it("fires on touch down only when the item is ready", async () => {
    await show({ item: "nitro", rolling: true, next: "orb" });
    act(() => button().dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(useItem).not.toHaveBeenCalled();
    await show({ item: "nitro", next: "orb" });
    act(() => button().dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(useItem).toHaveBeenCalledTimes(1);
  });

  it("slides the queued item forward after a use", async () => {
    await show({ item: "nitro", next: "orb" });
    expect(sliding()).toBe(false);
    await show({ item: "orb", next: null, uses: 1 });
    expect(sliding()).toBe(true);
    expect(container.querySelector(".mk-power__next--full")).toBeNull();
  });

  it("does not slide an item that came fresh from a box with the same update as a use", async () => {
    await show({ item: "orb", next: null, uses: 1 });
    await show({ item: "ghost", rolling: true, next: null, uses: 2 });
    expect(sliding()).toBe(false);
    expect(container.querySelector(".mk-power__name")?.textContent).toBe("Rolling");
  });
});
