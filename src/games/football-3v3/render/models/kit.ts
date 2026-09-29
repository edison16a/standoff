import { CHARACTERS, LINEMAN_BUILD, type CharacterId, type Look } from "../../roster";
import { TEAMS, type TeamId } from "../../teams";

/**
 * Everything the model builder needs for one player: the team kit, the
 * character's own look, and the extra touches the renderer adds so the
 * six stars read apart at a glance, even from the high camera.
 */
export interface KitSpec {
  jersey: string;
  /** Numbers and the shoulder stripes. */
  trim: string;
  pants: string;
  helmet: string;
  /** The stripe down the middle of the helmet. */
  stripe: string;
  socks: string;
  number: number;
  /** Across the shoulders on the back, or null for the linemen. */
  name: string | null;
  look: Look;
  height: number;
  /** 0 for a lean build up to about 1.4 for a lineman, from weight over height squared. */
  build: number;
  sleeves: "bare" | "short" | "long";
  /** A thick collar behind the helmet, as hitters wear. */
  neckRoll: boolean;
  /** A towel tucked in the waistband. */
  towel: boolean;
  /** Locks hanging out below the back of the helmet. */
  locks: string | null;
  /** Painted under the eyes, visible through an open mask. */
  eyeBlack: boolean;
}

/** Per character touches on top of the roster's look. */
const EXTRAS: Record<CharacterId, Pick<KitSpec, "sleeves" | "neckRoll" | "towel" | "locks" | "eyeBlack">> = {
  reed: { sleeves: "short", neckRoll: false, towel: true, locks: null, eyeBlack: true },
  banks: { sleeves: "bare", neckRoll: false, towel: true, locks: "#1a120c", eyeBlack: false },
  kowalski: { sleeves: "bare", neckRoll: true, towel: false, locks: null, eyeBlack: true },
  ortiz: { sleeves: "long", neckRoll: false, towel: false, locks: "#2a1a10", eyeBlack: false },
  lindqvist: { sleeves: "short", neckRoll: false, towel: false, locks: "#d8b26a", eyeBlack: false },
  fields: { sleeves: "long", neckRoll: true, towel: false, locks: null, eyeBlack: true },
};

/** Linemen share a build and a plain look, with the skin changing by slot so the line is not a row of clones. */
const LINEMAN_SKIN = ["#e0b793", "#6b4431", "#a8704c"];

export function buildFor(height: number, weight: number): number {
  const bmi = weight / (height * height);
  return Math.max(0, Math.min(1.4, (bmi - 24) / 9));
}

function teamKit(team: TeamId): Pick<KitSpec, "jersey" | "trim" | "pants" | "helmet" | "stripe" | "socks"> {
  const t = TEAMS[team];
  // Storm wears gold pants under blue, Blaze white under red, like home and away uniforms.
  return { jersey: t.color, trim: t.trim, pants: team === 0 ? "#d9b54a" : "#f1f1ef", helmet: t.dark, stripe: t.trim, socks: t.dark };
}

export function characterKit(team: TeamId, id: CharacterId): KitSpec {
  const c = CHARACTERS[id];
  return {
    ...teamKit(team), ...EXTRAS[id], number: c.number, name: c.short.toUpperCase(), look: c.look,
    height: c.build.height, build: buildFor(c.build.height, c.build.weight),
  };
}

export function linemanKit(team: TeamId, number: number, slot: number): KitSpec {
  const look: Look = { skin: LINEMAN_SKIN[slot % 3]!, mask: "cage", visor: null, accent: TEAMS[team].dark, cleats: "#111111" };
  return {
    ...teamKit(team), look, number, name: null, height: LINEMAN_BUILD.height, build: buildFor(LINEMAN_BUILD.height, LINEMAN_BUILD.weight),
    sleeves: "bare", neckRoll: slot === 1, towel: false, locks: null, eyeBlack: false,
  };
}
