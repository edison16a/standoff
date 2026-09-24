import { describe, expect, it } from "vitest";
import { clientEnvelopeSchema } from "./envelopes";

describe("clientEnvelopeSchema", () => {
  it("passes any game payload through and upper cases room codes", () => {
    const motion = clientEnvelopeSchema.parse({
      type: "phone:send",
      payload: { kind: "motion", pitch: 0.2, yaw: -0.1, roll: 0, move: 0.5 },
    });
    expect(motion).toEqual({ type: "phone:send", payload: { kind: "motion", pitch: 0.2, yaw: -0.1, roll: 0, move: 0.5 } });
    const join = clientEnvelopeSchema.parse({ type: "phone:join", code: "abcd" });
    expect(join).toEqual({ type: "phone:join", code: "ABCD" });
    expect(clientEnvelopeSchema.safeParse({ type: "host:create", game: "go-kart", seats: 4 }).success).toBe(true);
  });

  it("rejects envelopes the relay cannot route", () => {
    const bad = [
      { type: "phone:send", payload: { pitch: 0 } },
      { type: "phone:send", payload: { kind: "" } },
      { type: "phone:join", code: "TOOLONG" },
      { type: "host:send", to: 5, payload: { kind: "state" } },
      { type: "host:create", game: "Fencing!", seats: 2 },
      { type: "host:create", game: "fencing", seats: 0 },
      { type: "nonsense" },
    ];
    for (const envelope of bad) expect(clientEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });
});
