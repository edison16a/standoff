import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./loader.css", import.meta.url), "utf8");

/** Every block whose selector matches, with its body. */
function blocks(selector: RegExp): string[] {
  const found: string[] = [];
  const pattern = /([^{}]+)\{((?:[^{}]|\{[^{}]*\})*)\}/g;
  for (let match = pattern.exec(css); match; match = pattern.exec(css)) {
    if (selector.test(match[1]!)) found.push(match[2]!);
  }
  return found;
}

describe("loader", () => {
  // The triangles once faded as they hopped, which read as a glitch. They stay solid.
  it("never fades the logo's triangles as they hop", () => {
    const hop = blocks(/@keyframes loader-hop/);
    expect(hop).toHaveLength(1);
    expect(hop[0]).not.toMatch(/opacity/);
    for (const body of blocks(/\.loader__shape/)) expect(body).not.toMatch(/opacity/);
  });
});
