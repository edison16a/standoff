/**
 * What a game imports to add keyboard play. See README.md in this folder.
 */
export type { ControlGroup, ControlRow, KeyCaps, KeyboardBinding, KeyboardContext, KeyboardPlayer, StagePointer } from "./types";
export { StickKeys, stickVector, type StickLayout, type StickVector } from "./stick-keys";
export { ButtonKeys, type ButtonHandlers, type ButtonMap } from "./button-keys";
export { MouseAim, toStagePoint, type AimPoint, type MouseAimHandlers } from "./mouse-aim";
