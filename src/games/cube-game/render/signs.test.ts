import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { Signs } from "./signs";

// The real words are drawn on a canvas, which tests do not have.
vi.mock("./textures", () => ({ wordsTexture: () => new THREE.Texture() }));

function sprites(signs: Signs): THREE.Sprite[] {
  return signs.group.children.filter((child): child is THREE.Sprite => child instanceof THREE.Sprite);
}

describe("Signs", () => {
  it("shows the attempt counter only in its own player's view", () => {
    const signs = new Signs();
    signs.setAttempt(0, 2);
    signs.setAttempt(1, 5);
    signs.show(1, 0);
    expect(sprites(signs).map((s) => s.visible)).toEqual([false, true]);
  });

  it("shows no counter for attempt zero, as behind the menu", () => {
    const signs = new Signs();
    signs.setAttempt(0, 0);
    signs.show(0, 0);
    expect(sprites(signs)[0]!.visible).toBe(false);
    signs.setAttempt(0, 1);
    signs.show(0, 0);
    expect(sprites(signs)[0]!.visible).toBe(true);
  });
});
