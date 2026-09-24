import { describe, expect, it } from "vitest";
import { clientEnvelopeSchema } from "./envelopes";

describe("clientEnvelopeSchema", () => {
  it("accepts a motion frame and upper cases room codes", () => {
    const motion = clientEnvelopeSchema.parse({
      type: "phone:send",
      payload: { kind: "motion", pitch: 0.2, yaw: -0.1, roll: 0, move: 0.5 },
    });
    expect(motion.type).toBe("phone:send");
    const join = clientEnvelopeSchema.parse({ type: "phone:join", code: "abcd" });
    expect(join).toEqual({ type: "phone:join", code: "ABCD" });
  });

  it("rejects values a real controller cannot produce", () => {
    const bad = [
      { type: "phone:send", payload: { kind: "motion", pitch: 9, yaw: 0, roll: 0, move: 0 } },
      { type: "phone:send", payload: { kind: "motion", pitch: 0, yaw: 0, roll: 0, move: 2 } },
      { type: "phone:send", payload: { kind: "pick", characterId: "someone" } },
      { type: "phone:join", code: "TOOLONG" },
      { type: "host:send", to: 3, payload: { kind: "recenter" } },
      { type: "nonsense" },
    ];
    for (const envelope of bad) expect(clientEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });
});
