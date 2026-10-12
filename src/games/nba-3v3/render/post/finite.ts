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
 *
 * Positive infinity is light, not a fault: a sharp glint brighter than a
 * half float holds is stored as infinity. It is kept as the brightest
 * value, so the glint shows white instead of a black dot. NaN and
 * negative infinity are nothing and go black, and so does any negative
 * light, which a blur would otherwise spread as a dark smear.
 */
export const FINITE = /* glsl */ `
  bool nonFinite(vec3 c) {
    uvec3 e = floatBitsToUint(c) & uvec3(0x7f800000u);
    return any(equal(e, uvec3(0x7f800000u)));
  }
  vec3 finite(vec3 c) {
    uvec3 bits = floatBitsToUint(c);
    bvec3 bad = equal(bits & uvec3(0x7f800000u), uvec3(0x7f800000u));
    bvec3 hot = equal(bits, uvec3(0x7f800000u));
    // The boolean mix picks a side without arithmetic, so a NaN on the side not taken never leaks through.
    vec3 kept = clamp(c, vec3(0.0), vec3(${HALF_MAX.toFixed(1)}));
    vec3 swap = mix(vec3(0.0), vec3(${HALF_MAX.toFixed(1)}), hot);
    return mix(kept, swap, bad);
  }
`;

const word = new DataView(new ArrayBuffer(4));
const EXPONENT = 0x7f800000;

/** The same bit test as the shader's, on a 32 bit float: true for NaN and both infinities. */
export function nonFinite(x: number): boolean {
  word.setFloat32(0, x);
  return (word.getUint32(0) & EXPONENT) === EXPONENT;
}

/** The same clean up as the shader's `finite`, for one channel: positive infinity is the brightest light, other bad values and negatives go black. */
export function finite(x: number): number {
  if (nonFinite(x)) return Math.fround(x) === Infinity ? HALF_MAX : 0;
  return Math.min(Math.max(x, 0), HALF_MAX);
}
