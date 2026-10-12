/**
 * Turns the depth buffer's 0 to 1 back into metres from the camera, for
 * a depth of field. The depth is clamped and the divisor kept above
 * zero, so a stray depth past the far plane (a resolve that rounds up,
 * or a sample off the edge) can never divide by zero and blur a pixel by
 * infinity.
 */
export const VIEW_DEPTH = /* glsl */ `
  uniform float uNear;
  uniform float uFar;
  float metres(float d) { return (uNear * uFar) / max(uFar - clamp(d, 0.0, 1.0) * (uFar - uNear), 1e-6); }
`;

/** A focus fit for the shaders. A NaN or infinite distance (a subject lost for a frame) would blur every pixel by NaN: a black screen. */
export function safeFocus(focus: { distance: number; range: number }, fallback: { distance: number; range: number }): { distance: number; range: number } {
  const distance = Number.isFinite(focus.distance) ? Math.max(0.1, focus.distance) : fallback.distance;
  const range = Number.isFinite(focus.range) ? Math.max(0, focus.range) : fallback.range;
  return { distance, range };
}
