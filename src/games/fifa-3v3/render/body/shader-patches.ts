import * as THREE from "three";

/**
 * Small additions to three's standard shader, applied in
 * `onBeforeCompile`. Each keeps the shader text the same for every
 * material using it, so they all share one compiled program.
 */

type Shader = THREE.WebGLProgramParametersWithUniforms;

/** Roughness vertex by vertex from a `rough` attribute, so one material can be wet eyes, leather boots and matte hair. */
export function roughFromVertices(shader: Shader): void {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nattribute float rough;\nvarying float vRough;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRough = rough;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float vRough;")
    .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor *= vRough;");
}

/**
 * Hair drawn strand by strand: where a vertex carries a `grain`, the
 * colour is streaked by a pattern stretched across the way the strands
 * lie, measured on the body at rest so it never swims as the player
 * moves. Where the strands get finer than a pixel the streaks fade out,
 * so distant hair never shimmers.
 */
export function hairStrands(shader: Shader): void {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nattribute vec3 grain;\nvarying vec3 vGrain;\nvarying vec3 vRest;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGrain = grain;\nvRest = position;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vGrain;\nvarying vec3 vRest;")
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      if ( dot( vGrain, vGrain ) > 0.0 ) {
        vec3 q = vRest * vGrain;
        float s = q.x + q.y + q.z;
        float strands = 0.55 * sin( s + 1.7 * sin( 0.31 * q.x + 0.53 * q.y + 0.71 * q.z ) ) + 0.45 * sin( 1.37 * s + 2.3 * sin( 0.17 * q.x + 0.29 * q.y + 0.13 * q.z ) );
        float fine = 1.0 - smoothstep( 0.8, 2.6, length( fwidth( q ) ) );
        diffuseColor.rgb *= 1.0 + 0.38 * strands * fine;
      }`,
    );
}

const IRRADIANCE = "vec3 irradiance = dotNL * directLight.color;";
const DIFFUSE = "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );";

/**
 * Skin that light soaks into: diffuse light wraps a little past where
 * the surface turns away, red furthest, the way light scatters under
 * real skin, so a lit cheek fades into shadow through a warm band rather
 * than a hard grey line. The shine stays as it was.
 */
export function subsurfaceSkin(shader: Shader): void {
  if (!skinPatchApplies()) return;
  const chunk = THREE.ShaderChunk.lights_physical_pars_fragment
    .replace(IRRADIANCE, `${IRRADIANCE}\n\tvec3 skinWrap = saturate( ( vec3( dot( geometryNormal, directLight.direction ) ) + SKIN_WRAP ) / ( 1.0 + SKIN_WRAP ) ) * directLight.color;`)
    .replace(DIFFUSE, "reflectedLight.directDiffuse += skinWrap * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\n#define SKIN_WRAP vec3( 0.42, 0.2, 0.13 )")
    .replace("#include <lights_physical_pars_fragment>", chunk);
}

/** True while both lines the skin patch rewrites are still in three's shader, which an upgrade could change. */
export function skinPatchApplies(): boolean {
  const c = THREE.ShaderChunk.lights_physical_pars_fragment;
  return c.includes(IRRADIANCE) && c.includes(DIFFUSE);
}
