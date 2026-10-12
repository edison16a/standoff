import { describe, expect, it } from "vitest";
import { reflections, STREET, streetImpulse } from "./street-impulse";

const RATE = 48000;

function rms(data: Float32Array, from: number, to: number): number {
  let sum = 0;
  const a = Math.round(from * RATE);
  const b = Math.round(to * RATE);
  for (let i = a; i < b; i++) sum += data[i]! ** 2;
  return Math.sqrt(sum / (b - a));
}

describe("the street echo", () => {
  it("hears the near facade first, then the far one, then the flutter between them", () => {
    const list = reflections(STREET);
    expect(list[0]!.delay).toBeCloseTo((2 * STREET.left) / 343, 4);
    expect(list[0]!.side).toBe(-1);
    expect(list[1]!.delay).toBeCloseTo((2 * STREET.right) / 343, 4);
    expect(list[1]!.side).toBe(1);
    // Off one wall and back off the other: the street's width there and back.
    expect(list.some((r) => r.order === 2 && Math.abs(r.delay - (2 * (STREET.left + STREET.right)) / 343) < 1e-4)).toBe(true);
    expect(list.some((r) => r.side === 0 && Math.abs(r.delay - (2 * STREET.far) / 343) < 1e-4)).toBe(true);
    for (let i = 1; i < list.length; i++) expect(list[i]!.delay).toBeGreaterThanOrEqual(list[i - 1]!.delay);
  });

  it("builds two equal channels as long as the tail, peaking at full scale", () => {
    const [left, right] = streetImpulse(RATE);
    expect(left.length).toBe(Math.round(RATE * STREET.rt60 * 1.15));
    expect(right.length).toBe(left.length);
    const peak = [left, right].reduce((m, data) => data.reduce((n, v) => Math.max(n, Math.abs(v)), m), 0);
    expect(peak).toBeCloseTo(1, 5);
  });

  it("leaves the direct sound to the dry path: silent before the first echo", () => {
    const [left, right] = streetImpulse(RATE);
    const first = (2 * STREET.left) / 343;
    expect(rms(left, 0, first - 0.001)).toBe(0);
    expect(rms(right, 0, first - 0.001)).toBe(0);
  });

  it("sends the left facade's slap to the left ear louder", () => {
    const [left, right] = streetImpulse(RATE);
    const at = (2 * STREET.left) / 343;
    expect(rms(left, at, at + 0.004)).toBeGreaterThan(rms(right, at, at + 0.004) * 1.5);
  });

  it("dies away over the tail", () => {
    const [left] = streetImpulse(RATE);
    const end = left.length / RATE;
    expect(rms(left, 0.2, 0.4)).toBeGreaterThan(rms(left, 1, 1.2) * 4);
    expect(rms(left, 1, 1.2)).toBeGreaterThan(rms(left, end - 0.2, end));
  });

  it("is the same every time for the same seed", () => {
    expect(streetImpulse(RATE, STREET, 3)[0]).toEqual(streetImpulse(RATE, STREET, 3)[0]);
  });
});
