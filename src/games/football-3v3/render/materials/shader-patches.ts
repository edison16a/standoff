import * as THREE from "three";

/**
 * Small additions to three's standard shader, made in onBeforeCompile.
 * Each keeps the shader text fixed, so every material with a patch shares
 * one compiled program across all the players.
 */

type Shader = THREE.WebGLProgramParametersWithUniforms;

const DIFFUSE = "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );";
const IRRADIANCE = "vec3 irradiance = dotNL * directLight.color;";

/** Roughness vertex by vertex from a `rough` attribute, so one material is glossy leather, matte cotton and wet eyes at once. */
export function roughFromVertices(shader: Shader): void {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nattribute float rough;\nvarying float vRough;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRough = rough;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float vRough;")
    .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor *= vRough;");
}

/**
 * Light that soaks into skin: the diffuse light wraps past the edge of
 * the lit side, red furthest, so a cheek fades into shadow through a
 * warm band rather than a hard grey line. The shine is unchanged.
 */
export function skinWrap(shader: Shader): void {
  const chunk = THREE.ShaderChunk.lights_physical_pars_fragment
    .replace(IRRADIANCE, `${IRRADIANCE}\n\tvec3 wrapLight = saturate( ( vec3( dot( geometryNormal, directLight.direction ) ) + SKIN_WRAP ) / ( 1.0 + SKIN_WRAP ) ) * directLight.color;`)
    .replace(DIFFUSE, "reflectedLight.directDiffuse += wrapLight * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\n#define SKIN_WRAP vec3( 0.45, 0.2, 0.12 )")
    .replace("#include <lights_physical_pars_fragment>", chunk);
}

/** True while both lines the skin patch replaces are still in three's shader, which an upgrade could change. */
export function skinWrapApplies(): boolean {
  const c = THREE.ShaderChunk.lights_physical_pars_fragment;
  return c.includes(IRRADIANCE) && c.includes(DIFFUSE);
}
