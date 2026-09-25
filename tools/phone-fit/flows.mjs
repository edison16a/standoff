// Every game's phone steps, in order, after the platform's name screen.
// Each flow gets the check's context: snap(step) measures the page,
// tap(text) presses a button, hold(view) turns the phone, and fake(kind,
// patch) hands the phone a made up host message, to reach pages like
// results without playing a whole game. ctx.sensors says whether the
// phone has motion sensors. An entry is a flow, or a flow
// with the game it opens and whether the phone has motion sensors, for a
// second pass at the same game.
import { fruitNinja, shootingGallery, zombieSurvival } from "./flows/aim-games.mjs";
import { fencing, fencingButtons } from "./flows/fencing.mjs";
import { brawlBattle, fifa3v3, magicKart, magicKartButtons, nba3v3 } from "./flows/pad-games.mjs";

export const FLOWS = {
  "magic-kart": magicKart,
  // Steering with arrow buttons, for a phone with no tilt sensor.
  "magic-kart-buttons": { game: "magic-kart", flow: magicKartButtons, sensors: false },
  "fruit-ninja": fruitNinja,
  "zombie-survival": zombieSurvival,
  "shooting-gallery": shootingGallery,
  // The aiming games with a drag pad, for a phone with no motion sensors.
  "fruit-ninja-touch": { game: "fruit-ninja", flow: fruitNinja, sensors: false },
  "zombie-survival-touch": { game: "zombie-survival", flow: zombieSurvival, sensors: false },
  "shooting-gallery-touch": { game: "shooting-gallery", flow: shootingGallery, sensors: false },
  "nba-3v3": nba3v3,
  "fifa-3v3": fifa3v3,
  fencing,
  // Fencing with buttons, for a phone with no motion sensors.
  "fencing-buttons": { game: "fencing", flow: fencingButtons, sensors: false },
  "brawl-battle": brawlBattle,
};
