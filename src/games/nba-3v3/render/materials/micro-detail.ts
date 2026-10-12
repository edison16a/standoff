import type * as THREE from "three";

type Shader = THREE.WebGLProgramParametersWithUniforms;

/**
 * Detail too fine to model, drawn in the shader as bumps from noise:
 * pores on the skin, and on hair the strands combed out from the crown
 * or the tight coils of curls and beards. The noise is laid on the body
 * at rest, so it moves with the skin, and it fades out as the player
 * gets small on screen, where it would only sparkle.
 */

const NOISE = /* glsl */ `
varying vec3 vRest;
float mdHash( vec3 p ) {
  p = fract( p * 0.1031 );
  p += dot( p, p.zyx + 31.32 );
  return fract( ( p.x + p.y ) * p.z );
}
float mdNoise( vec3 p ) {
  vec3 i = floor( p );
  vec3 f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( mix( mdHash( i ), mdHash( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ), mix( mdHash( i + vec3( 0.0, 1.0, 0.0 ) ), mdHash( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ), f.y ),
    mix( mix( mdHash( i + vec3( 0.0, 0.0, 1.0 ) ), mdHash( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ), mix( mdHash( i + vec3( 0.0, 1.0, 1.0 ) ), mdHash( i + vec3( 1.0, 1.0, 1.0 ) ), f.x ), f.y ),
    f.z );
}
// Every normalize is guarded: a zero length vector gives NaN on most graphics cards, a black speck.
vec3 mdPerturb( vec3 surfPos, vec3 surfNorm, float h, float faceDir ) {
  vec3 dx = dFdx( surfPos );
  vec3 dy = dFdy( surfPos );
  if ( dot( dx, dx ) < 1e-30 || dot( dy, dy ) < 1e-30 ) return surfNorm;
  vec2 dHdxy = vec2( dFdx( h ), dFdy( h ) );
  vec3 sx = normalize( dx );
  vec3 sy = normalize( dy );
  vec3 r1 = cross( sy, surfNorm );
  vec3 r2 = cross( surfNorm, sx );
  float det = dot( sx, r1 ) * faceDir;
  vec3 grad = sign( det ) * ( dHdxy.x * r1 + dHdxy.y * r2 );
  vec3 n = abs( det ) * surfNorm - grad;
  return dot( n, n ) < 1e-30 ? surfNorm : normalize( n );
}
`;

/** Passes each vertex's spot at rest to the fragment shader, where the noise is laid. */
function rest(shader: Shader, extra = ""): void {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", `#include <common>\nvarying vec3 vRest;\n${extra}`)
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRest = position;");
  shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${NOISE}`);
}

/** Pores: two scales of shallow dimples, faded out once a millimetre is under a pixel. */
export function skinPores(shader: Shader): void {
  rest(shader);
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <normal_fragment_maps>",
    `#include <normal_fragment_maps>
    {
      float px = length( fwidth( vRest ) );
      float fade = 1.0 - smoothstep( 0.0004, 0.0016, px );
      if ( fade > 0.0 ) {
        float h = ( mdNoise( vRest * 760.0 ) * 0.6 + mdNoise( vRest * 210.0 ) * 0.4 ) * 0.00014 * fade;
        normal = mdPerturb( - vViewPosition, normal, h, faceDirection );
      }
    }`,
  );
}

/** Hair and beards by the `fiber` attribute: 1 for strands combed from the crown, 2 for coils. */
export function hairFibers(shader: Shader): void {
  rest(shader, "attribute float fiber;\nvarying float vFiber;");
  shader.vertexShader = shader.vertexShader.replace("vRest = position;", "vRest = position;\nvFiber = fiber;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float vFiber;")
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      if ( vFiber > 0.5 ) {
        float px = length( fwidth( vRest ) );
        float fade = 1.0 - smoothstep( 0.0009, 0.0045, px );
        if ( fade > 0.0 ) {
          // atan of two zeros is undefined, NaN on some cards.
          float az = vRest.z - 0.01;
          float around = abs( vRest.x ) + abs( az ) > 1e-6 ? atan( vRest.x, az ) : 0.0;
          float strands = sin( around * 150.0 + mdNoise( vRest * 90.0 ) * 7.0 ) * 0.5 + 0.5;
          float coils = mdNoise( vRest * 520.0 ) * 0.6 + mdNoise( vRest * 170.0 ) * 0.4;
          float h = mix( strands * 0.7 + coils * 0.3, coils, step( 1.5, vFiber ) ) * 0.0005 * fade;
          normal = mdPerturb( - vViewPosition, normal, h, faceDirection );
        }
      }`,
    );
}
