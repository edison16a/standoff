import * as THREE from "three";

/**
 * Small additions to three's standard shader, applied in
 * `onBeforeCompile`. Each keeps the shader text fixed, so every material
 * using a patch shares one compiled program.
 */

type Shader = THREE.WebGLProgramParametersWithUniforms;

/** Roughness vertex by vertex from a `rough` attribute, so one material can be glossy leather, matte cotton and wet eyes. */
export function roughFromVertices(shader: Shader): void {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nattribute float rough;\nvarying float vRough;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRough = rough;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float vRough;")
    .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor *= vRough;");
}

/**
 * Skin that light soaks into: diffuse light wraps past the terminator,
 * red furthest, the way light scatters under real skin, so a lit cheek
 * fades into shadow through a warm band instead of a hard grey line.
 * The specular stays as it was.
 */
export function subsurfaceSkin(shader: Shader): void {
  const chunk = THREE.ShaderChunk.lights_physical_pars_fragment
    .replace(
      "vec3 irradiance = dotNL * directLight.color;",
      "vec3 irradiance = dotNL * directLight.color;\n\tvec3 skinWrap = saturate( ( vec3( dot( geometryNormal, directLight.direction ) ) + SKIN_WRAP ) / ( 1.0 + SKIN_WRAP ) ) * directLight.color;",
    )
    .replace(
      "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );",
      "reflectedLight.directDiffuse += skinWrap * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );",
    );
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\n#define SKIN_WRAP vec3( 0.42, 0.21, 0.14 )")
    .replace("#include <lights_physical_pars_fragment>", chunk);
}

/** True if both replacements in the skin patch still find their lines, which a three upgrade could break. */
export function skinPatchApplies(): boolean {
  const c = THREE.ShaderChunk.lights_physical_pars_fragment;
  return c.includes("vec3 irradiance = dotNL * directLight.color;") && c.includes("reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );");
}
