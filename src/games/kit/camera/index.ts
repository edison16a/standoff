/**
 * The camera kit: the computer's webcam, a pose model running in the
 * browser, and every player's body and moves. See the camera section of
 * src/games/kit/README.md for how games use it.
 */
export { CameraKit, type CameraKitOptions } from "./host/camera-kit";
export type { KitStatus, CameraStatus, ModelStatus } from "./host/kit-status";
export type { CameraKitTestHooks } from "./host/test-hooks";
export { CameraError, PROBLEM_TEXT, type CameraProblem } from "./device/camera-errors";
export type { CameraDevice } from "./device/webcam";
export type { ModelVariant } from "./model/model-files";

export type { Body, Arm, Hand, Velocity } from "./engine/body";
export { LM, BONES, type Landmark, type Pose } from "./engine/landmarks";
export type { Point } from "./engine/geometry";
export { BaselineCollector, sampleOf, type Baseline, type CalibrationProgress } from "./engine/calibration";
export { spotsFor, checkSpot, type Spot, type SpotIssue, type SpotRules } from "./engine/spots";
export type { TrackFrame } from "./engine/tracker";
export { MoveReader, type MoveEvent, type MoveState } from "./engine/gestures/moves";
export { DEFAULT_MOVES, type MoveOptions, type MoveTuning } from "./engine/gestures/options";
export type { Punch } from "./engine/gestures/punch";
export type { Side } from "./engine/gestures/lean";
export { syntheticPose, type PoseSpec, type ArmSpec } from "./engine/synthetic";
export { poseAt, MOVES, type PoseKey } from "./engine/timeline";

export { ModelLoader, PRIVACY_NOTE } from "./ui/ModelLoader";
export { CameraPreview } from "./ui/CameraPreview";
export { CornerPreview } from "./ui/CornerPreview";
export { CameraCalibrate, type CalibrateExtraContext } from "./ui/CameraCalibrate";
export { CameraPicker } from "./ui/CameraPicker";
export { useKitStatus } from "./ui/use-kit";
