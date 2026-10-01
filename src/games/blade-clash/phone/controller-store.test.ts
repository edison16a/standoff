import { describe, expect, it } from "vitest";
import type { ControllerState } from "@/games/blade-clash/protocol";
import { phonePage } from "./controller-store";

const game = (phase: ControllerState["phase"]) => ({ phase }) as ControllerState;

describe("the phone's page", () => {
  it("is setup in the lobby and before the host speaks", () => {
    expect(phonePage({ game: null, calibrated: false })).toBe("setup");
    expect(phonePage({ game: game("lobby"), calibrated: true })).toBe("setup");
  });

  it("is the match for a calibrated phone", () => {
    expect(phonePage({ game: game("live"), calibrated: true })).toBe("match");
  });

  it("aims again first for a phone that rejoined mid match", () => {
    expect(phonePage({ game: game("countdown"), calibrated: false })).toBe("calibrate");
    expect(phonePage({ game: game("paused"), calibrated: false })).toBe("calibrate");
  });

  it("needs no aim for the rematch buttons", () => {
    expect(phonePage({ game: game("matchOver"), calibrated: false })).toBe("match");
  });
});
