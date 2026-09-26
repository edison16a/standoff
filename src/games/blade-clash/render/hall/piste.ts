import * as THREE from "three";
import { LINE_HALF_LENGTH } from "@/games/blade-clash/engine/rules";
import { disposeOwned, MeshBuilder } from "../kit/mesh-builder";
import { glow, own, plastic } from "../kit/materials";
import type { HallTheme } from "./hall-theme";
import { pisteTexture, STRIP_WIDTH } from "./hall-textures";

/** The podium's top, where the fighters stand. Everything on the strip sits at this height. */
export const PODIUM_TOP = 0.12;
const PODIUM_HALF_LENGTH = LINE_HALF_LENGTH + 1.8;
const PODIUM_WIDTH = 2.5;

/**
 * The strip on a raised podium, finals style. The strip's surface carries
 * the markings. Along the podium's front and back edges run light strips,
 * red on player one's half and green on player two's, which flare when
 * that side scores.
 */
export class Piste {
  readonly group = new THREE.Group();
  private readonly leds: Record<1 | 2, THREE.MeshStandardMaterial>;
  private readonly flare = { 1: 0, 2: 0 };

  constructor(theme: HallTheme) {
    const b = new MeshBuilder();
    const podium = new THREE.MeshStandardMaterial({ color: theme.podium, roughness: 0.35, metalness: 0.2 });
    b.box(PODIUM_HALF_LENGTH * 2, PODIUM_TOP - 0.01, PODIUM_WIDTH, podium, [0, (PODIUM_TOP - 0.01) / 2, 0], [0, 0, 0], 0.02);
    // A dark rubber skirt at the base, so the podium sits on the floor.
    b.box(PODIUM_HALF_LENGTH * 2 + 0.04, 0.025, PODIUM_WIDTH + 0.04, plastic(0x111318, 0.8), [0, 0.0125, 0]);
    this.group.add(b.build("podium"));

    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(LINE_HALF_LENGTH * 2, STRIP_WIDTH),
      new THREE.MeshStandardMaterial({ map: pisteTexture(`#${theme.piste.toString(16).padStart(6, "0")}`), roughness: 0.34, metalness: 0.45 }),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.y = PODIUM_TOP + 0.002;
    strip.receiveShadow = true;
    this.group.add(strip);
    // Run off beyond each end line, in the podium's colour but matt.
    for (const side of [-1, 1]) {
      const runoff = new THREE.Mesh(new THREE.PlaneGeometry(1.6, STRIP_WIDTH), new THREE.MeshStandardMaterial({ color: theme.piste, roughness: 0.7, metalness: 0.2 }));
      runoff.rotation.x = -Math.PI / 2;
      runoff.position.set(side * (LINE_HALF_LENGTH + 0.8), PODIUM_TOP + 0.0015, 0);
      runoff.receiveShadow = true;
      this.group.add(runoff);
    }

    this.leds = {
      1: own(glow(0xff4757, theme.boardGlow)),
      2: own(glow(0x2ed573, theme.boardGlow)),
    };
    const ledB = new MeshBuilder();
    for (const z of [-1, 1]) {
      for (const slot of [1, 2] as const) {
        const sign = slot === 1 ? -1 : 1;
        ledB.box(PODIUM_HALF_LENGTH - 0.05, 0.022, 0.012, this.leds[slot], [sign * (PODIUM_HALF_LENGTH / 2), PODIUM_TOP * 0.55, z * (PODIUM_WIDTH / 2 + 0.006)]);
      }
    }
    this.group.add(ledB.build("podium-leds", false));
  }

  /** Lights up the scorer's half of the podium. */
  flash(slot: 1 | 2): void {
    this.flare[slot] = 1;
  }

  update(dtMs: number, base: number): void {
    for (const slot of [1, 2] as const) {
      this.flare[slot] *= Math.exp(-dtMs / 600);
      this.leds[slot].emissiveIntensity = base * (1 + this.flare[slot] * 5);
    }
  }

  dispose(): void {
    disposeOwned(this.group);
  }
}
