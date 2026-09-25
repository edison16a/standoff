/**
 * The four fighters: names, colours for the picker and the HUD, and the
 * body numbers the engine plays them with. Their moves live in
 * engine/moves. Units are metres and seconds; a fighter is about 1.8 m.
 */

export const CHARACTER_IDS = ["karate", "samurai", "mage", "bear"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface Physique {
  /** Top running speed on the ground. */
  run: number;
  /** Top sideways speed in the air. */
  air: number;
  /** How fast they reach those speeds, per second. */
  accel: number;
  airAccel: number;
  /** Upward speed of the first jump and of the double jump. */
  jump: number;
  doubleJump: number;
  gravity: number;
  /** Top falling speed, and the speed of a fast fall with down held. */
  fall: number;
  fastFall: number;
  /** 100 is average. Heavier fighters fly less far from the same hit. */
  weight: number;
  /** The hurtbox, centred over the feet. */
  width: number;
  height: number;
}

export interface Character {
  id: CharacterId;
  name: string;
  /** One line for the phone's picker. */
  blurb: string;
  /** Their own colour, used when nobody shares the character. */
  color: string;
  physique: Physique;
}

export const CHARACTERS: Record<CharacterId, Character> = {
  karate: {
    id: "karate",
    name: "Karate",
    blurb: "Fast kicks and punches. Quick in the air.",
    color: "#f8fafc",
    physique: { run: 8, air: 5.6, accel: 60, airAccel: 30, jump: 13.8, doubleJump: 12.4, gravity: 36, fall: 15, fastFall: 22, weight: 99, width: 0.8, height: 1.75 },
  },
  samurai: {
    id: "samurai",
    name: "Samurai",
    blurb: "Katana slashes with long reach.",
    color: "#dc2626",
    physique: { run: 6.6, air: 5, accel: 50, airAccel: 26, jump: 13.2, doubleJump: 12.6, gravity: 36, fall: 15.5, fastFall: 22.5, weight: 98, width: 0.8, height: 1.85 },
  },
  mage: {
    id: "mage",
    name: "Mage",
    blurb: "Magic bolts and blasts from afar.",
    color: "#7c3aed",
    physique: { run: 5.8, air: 5.2, accel: 42, airAccel: 28, jump: 12.8, doubleJump: 12.6, gravity: 32, fall: 13, fastFall: 19, weight: 80, width: 0.75, height: 1.8 },
  },
  bear: {
    id: "bear",
    name: "Bear",
    blurb: "Heavy slow slams that send foes flying.",
    color: "#92400e",
    physique: { run: 5.6, air: 4.4, accel: 38, airAccel: 20, jump: 13.8, doubleJump: 13.4, gravity: 40, fall: 17, fastFall: 24, weight: 108, width: 1.25, height: 2.1 },
  },
};

export function isCharacterId(value: string): value is CharacterId {
  return (CHARACTER_IDS as readonly string[]).includes(value);
}
