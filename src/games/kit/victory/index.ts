/**
 * The victory kit: three.js pieces for winners' scenes and the 2D names
 * over them. See the kit README for how to use each.
 */
export { VictoryConfetti, mulberry, type BurstOptions, type ConfettiOptions } from "./confetti/victory-confetti";
export { ConfettiSim, DEFAULT_PHYSICS, type ConfettiPhysics, type Emitter } from "./confetti/confetti-sim";
export { PAPER_COLOURS, FOIL_COLOURS } from "./confetti/confetti-geometry";
export { StageLights, type StageLightsOptions } from "./lights/stage-lights";
export { OrbitCamera } from "./camera/orbit-camera";
export { orbitPose, DEFAULT_ORBIT, type OrbitShot, type OrbitPose } from "./camera/orbit";
export { createBasketballTrophy } from "./trophies/basketball-trophy";
export { createWorldCupTrophy } from "./trophies/world-cup-trophy";
export { createBoxingBelt, type BeltOptions } from "./trophies/boxing-belt";
export { createCupTrophy } from "./trophies/cup-trophy";
export { metal, satinMetal, gem, lacquer, malachite, disposeTree, type Metal } from "./trophies/materials";
export { createPodium, createPedestal, type Podium, type PodiumOptions } from "./stands/podium";
export { studioEnvironment, stageFloor } from "./scene/environment";
export { VictoryRoom, type VictoryRoomOptions } from "./scene/victory-room";
