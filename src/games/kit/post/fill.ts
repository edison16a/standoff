/**
 * Fills a bad pixel from its good neighbours, for the last pass of a
 * finish: one pixel out each way, then two. A bad pixel turned black is
 * still a dark dot, and this leaves none. Needs `FINITE` in the shader
 * before it.
 */
export const FILL = /* glsl */ `
  vec3 fillHole(sampler2D tex, vec2 uv, vec2 texel) {
    const vec2 ring[8] = vec2[8](vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0), vec2(2.0, 0.0), vec2(-2.0, 0.0), vec2(0.0, 2.0), vec2(0.0, -2.0));
    vec3 sum = vec3(0.0);
    float n = 0.0;
    for (int i = 0; i < 8; i++) {
      vec3 t = texture2D(tex, uv + ring[i] * texel).rgb;
      if (nonFinite(t)) continue;
      sum += finite(t);
      n += 1.0;
    }
    return n > 0.0 ? sum / n : vec3(0.0);
  }
`;
