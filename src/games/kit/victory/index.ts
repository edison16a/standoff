/**
 * Pieces for winner scenes, shared by every game. See the kit README.
 * Everything three.js here is plain classes and functions, so a game
 * adds them to its own scene. `VictoryStage` is a whole scene on its own
 * canvas for games whose results sit apart from play.
 */
export { VictoryConfetti, CONFETTI_COLOURS, type ConfettiOptions } from "./confetti/confetti";
export { ConfettiSim, DEFAULT_TUNING, type CannonOptions, type ShowerOptions, type ConfettiTuning } from "./confetti/confetti-sim";
export { StageLights, type SpotOptions } from "./lights/stage-lights";
export { orbitPose, type OrbitShot, type OrbitPose } from "./camera/orbit";
export { OrbitCamera } from "./camera/orbit-camera";
export { createBasketballTrophy } from "./trophies/basketball-trophy";
export { createWorldTrophy } from "./trophies/world-trophy";
export { createBoxingBelt, HELD_BEND, DISPLAY_BEND, type Belt, type BeltOptions } from "./trophies/boxing-belt";
export { bendAt, type BeltBend } from "./trophies/belt-shape";
export { trophyMaterials, type TrophyMaterials } from "./trophies/materials";
export { studioEnvironment } from "./stage/studio-environment";
export type { Trophy, TrophyOptions } from "./trophies/trophy";
export { createPodium, type Podium, type PodiumOptions } from "./stage/podium";
export { VictoryStage, type VictoryStageOptions } from "./stage/victory-stage";
export { seededRandom } from "./random";
