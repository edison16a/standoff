/** Renderer names of WebGL drawn in software, where the model's GPU path is far slower than its CPU one. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

let cached: boolean | null = null;

/**
 * Whether WebGL is drawn in software on this computer, as when the
 * browser has blocked a faulty graphics driver. The pose model's GPU
 * delegate then runs many times slower than its CPU one, so the kit
 * starts on the CPU instead of finding out the slow way.
 */
export function softwareWebGl(): boolean {
  if (cached !== null) return cached;
  cached = false;
  if (typeof document === "undefined") return cached;
  try {
    const gl = document.createElement("canvas").getContext("webgl2") ?? document.createElement("canvas").getContext("webgl");
    if (!gl) return (cached = true);
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    cached = SOFTWARE.test(renderer);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
