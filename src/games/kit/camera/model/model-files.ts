/**
 * Where the pose model comes from. The runtime is pinned to the exact
 * version of @mediapipe/tasks-vision in package.json, since the wasm and
 * the JavaScript that drives it must match. A test fails when they drift.
 */
export const TASKS_VISION_VERSION = "1.0.1";

const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_BASE = "https://storage.googleapis.com/mediapipe-models/pose_landmarker";

export type ModelVariant = "full" | "lite";

export interface RemoteFile {
  url: string;
  /** The size once downloaded. The CDN compresses some files, so its own length header can be smaller. */
  bytes: number;
  type: string;
}

/** The full model is the most accurate. The lite one is for machines too slow for it. */
export const MODEL_FILES: Record<ModelVariant, RemoteFile> = {
  full: {
    url: `${MODEL_BASE}/pose_landmarker_full/float16/latest/pose_landmarker_full.task`,
    bytes: 9_398_198,
    type: "application/octet-stream",
  },
  lite: {
    url: `${MODEL_BASE}/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`,
    bytes: 5_777_746,
    type: "application/octet-stream",
  },
};

/** The wasm runtime and its loader. Old browsers without SIMD get the slower build. */
export function runtimeFiles(simd: boolean): { loader: RemoteFile; binary: RemoteFile } {
  const name = simd ? "vision_wasm_internal" : "vision_wasm_nosimd_internal";
  return {
    loader: { url: `${WASM_BASE}/${name}.js`, bytes: simd ? 323_377 : 323_180, type: "text/javascript" },
    binary: { url: `${WASM_BASE}/${name}.wasm`, bytes: simd ? 11_756_954 : 10_960_242, type: "application/wasm" },
  };
}

/** One cache per runtime version, so an upgrade starts clean and the old one is cleared. */
export const CACHE_PREFIX = "standoff-pose-";
export const CACHE_NAME = `${CACHE_PREFIX}${TASKS_VISION_VERSION}`;
