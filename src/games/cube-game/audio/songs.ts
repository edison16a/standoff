import type { Song } from "./song";
import { CIRCUIT_RUSH } from "./tracks/circuit-rush";
import { CLOUD_HOPPER } from "./tracks/cloud-hopper";
import { CORE_MELTDOWN } from "./tracks/core-meltdown";
import { FIRST_LIGHT } from "./tracks/first-light";
import { MENU } from "./tracks/menu";
import { SUNSET_BOUNCE } from "./tracks/sunset-bounce";

/**
 * One song per level plus the menu's, each in its own file under
 * `tracks/`. A level's song runs at the level's tempo, in its own key and
 * style, arranged on the level's own beats: the lead changes where the
 * mode changes, and the drums thin out to float through the UFO.
 */
export const SONGS: Record<string, Song> = {
  menu: MENU,
  "first-light": FIRST_LIGHT,
  "sunset-bounce": SUNSET_BOUNCE,
  "cloud-hopper": CLOUD_HOPPER,
  "circuit-rush": CIRCUIT_RUSH,
  "core-meltdown": CORE_MELTDOWN,
};
