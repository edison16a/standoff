/** The brightest a half float target holds; anything brighter is stored as infinity. */
export const HALF_MAX = 65504;

/**
 * Guards against a bad pixel (NaN or infinity) in the picture. One bad
 * value from any shader reaches the screen as black, and every pass that
 * averages neighbours (the bloom, the depth of field) spreads it into a
 * blot or a thick streak. So each pass cleans what it reads.
 *
 * The test reads the float's exponent bits instead of calling isnan or
 * isinf: some shader compilers (fast math on Metal, fxc on Direct3D)
 * assume no float is ever NaN and drop those calls as always false.
 */
export const FINITE = /* glsl */ `
  bool nonFinite(vec3 c) {
    uvec3 e = floatBitsToUint(c) & uvec3(0x7f800000u);
    return any(equal(e, uvec3(0x7f800000u)));
  }
  vec3 finite(vec3 c) {
    return nonFinite(c) ? vec3(0.0) : clamp(c, vec3(0.0), vec3(${HALF_MAX.toFixed(1)}));
  }
`;

const word = new DataView(new ArrayBuffer(4));
const EXPONENT = 0x7f800000;

/** The same bit test as the shader's, on a 32 bit float: true for NaN and both infinities. */
export function nonFinite(x: number): boolean {
  word.setFloat32(0, x);
  return (word.getUint32(0) & EXPONENT) === EXPONENT;
}

/** The same clean up as the shader's `finite`, for one channel: bad values go black, the rest stay within what a half float holds. */
export function finite(x: number): number {
  if (nonFinite(x)) return 0;
  return Math.min(Math.max(x, 0), HALF_MAX);
}
