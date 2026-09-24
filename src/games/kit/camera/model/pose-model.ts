import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { fetchCached, isCached } from "./asset-cache";
import { MODEL_FILES, runtimeFiles, type ModelVariant } from "./model-files";

export type Delegate = "GPU" | "CPU";

export interface LoadedModel {
  landmarker: PoseLandmarker;
  variant: ModelVariant;
  delegate: Delegate;
}

export interface ModelProgress {
  loaded: number;
  total: number;
  /** Downloading, then starting the model up, which compiles shaders and takes a moment. */
  stage: "download" | "start";
  /** Everything came from this computer's cache. */
  fromCache: boolean;
}

export interface LoadOptions {
  variant: ModelVariant;
  /** Try this first. GPU falls back to CPU when the browser cannot run it. */
  delegate: Delegate;
  onProgress?: (progress: ModelProgress) => void;
  signal?: AbortSignal;
}

/**
 * Downloads the pose model and its wasm runtime to this computer, keeps
 * them cached, and starts the model in the browser. The runtime is handed
 * to MediaPipe as blob URLs made from the cached bytes, so a second visit
 * needs no network at all.
 */
export async function loadPoseModel({ variant, delegate, onProgress, signal }: LoadOptions): Promise<LoadedModel> {
  const vision = await import("@mediapipe/tasks-vision");
  const runtime = runtimeFiles(await vision.FilesetResolver.isSimdSupported());
  const model = MODEL_FILES[variant];
  const files = [runtime.loader, runtime.binary, model];
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  const loaded = files.map(() => 0);
  // Known up front, so the loader says "from this computer" instead of "downloading" on a second visit.
  const fromCache = (await Promise.all(files.map(isCached))).every(Boolean);
  const report = (stage: ModelProgress["stage"]) =>
    onProgress?.({ loaded: Math.min(total, loaded.reduce((a, b) => a + b, 0)), total, stage, fromCache });
  report("download");
  const fetched = await Promise.all(
    files.map((file, i) =>
      fetchCached(
        file,
        (bytes) => {
          // A compressed download can report more than expected. Never let the bar run past full.
          loaded[i] = Math.min(bytes, file.bytes);
          report("download");
        },
        signal,
      ),
    ),
  );
  loaded.forEach((_, i) => (loaded[i] = files[i]!.bytes));
  report("start");
  const [loader, binary, weights] = fetched;
  const urls = [URL.createObjectURL(new Blob([loader!.bytes], { type: runtime.loader.type })), URL.createObjectURL(new Blob([binary!.bytes], { type: runtime.binary.type }))];
  try {
    const fileset = { wasmLoaderPath: urls[0]!, wasmBinaryPath: urls[1]! };
    const tryDelegate = (which: Delegate) =>
      vision.PoseLandmarker.createFromOptions(fileset, {
        // MediaPipe may keep the buffer it is given, so each try gets its own copy.
        baseOptions: { modelAssetBuffer: weights!.bytes.slice(), delegate: which },
        runningMode: "VIDEO",
        numPoses: 2,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    try {
      return { landmarker: await tryDelegate(delegate), variant, delegate };
    } catch (error) {
      if (delegate === "CPU") throw error;
      console.warn("Pose model: the GPU could not run it, so it runs on the CPU.", error);
      return { landmarker: await tryDelegate("CPU"), variant, delegate: "CPU" };
    }
  } finally {
    for (const url of urls) URL.revokeObjectURL(url);
  }
}
