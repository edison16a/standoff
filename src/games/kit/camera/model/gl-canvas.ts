/** Either kind of canvas MediaPipe can draw its WebGL on. */
export type ModelCanvas = HTMLCanvasElement | OffscreenCanvas;

/**
 * A canvas of our own for one run of the pose model. Left to itself
 * MediaPipe makes one per model and never lets its WebGL context go, even
 * once closed. The browser keeps only about sixteen contexts and drops the
 * oldest when there are more, and the oldest is the game's own 3D picture,
 * which then goes dark mid game. Holding the canvas lets us free it.
 */
export function modelCanvas(): ModelCanvas | undefined {
  if (typeof document !== "undefined") return document.createElement("canvas");
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1);
  return undefined;
}

/** Frees the WebGL context on a model's canvas, once the model is closed and never used again. */
export function releaseCanvas(canvas: ModelCanvas | undefined): void {
  if (!canvas) return;
  try {
    // Asking again for the type MediaPipe made hands back its context. The other type gives null.
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // A canvas holding some other kind of context has no WebGL to free.
  }
}
