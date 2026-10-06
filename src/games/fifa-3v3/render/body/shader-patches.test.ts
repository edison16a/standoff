import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { hairStrands, roughFromVertices, skinPatchApplies, subsurfaceSkin } from "./shader-patches";

/** The standard physical shader's source, as onBeforeCompile hands it over. */
function shader(): THREE.WebGLProgramParametersWithUniforms {
  return { vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms;
}

describe("shader patches", () => {
  it("still find the lines they rewrite in this version of three", () => {
    expect(skinPatchApplies()).toBe(true);
    for (const patch of [roughFromVertices, hairStrands]) {
      const s = shader();
      const before = s.vertexShader + s.fragmentShader;
      patch(s);
      expect(s.vertexShader + s.fragmentShader).not.toBe(before);
    }
  });

  it("wraps the skin's diffuse light and leaves its shine alone", () => {
    const s = shader();
    subsurfaceSkin(s);
    expect(s.fragmentShader).toContain("SKIN_WRAP");
    expect(s.fragmentShader).toContain("skinWrap * BRDF_Lambert");
    expect(s.fragmentShader).toContain("reflectedLight.directSpecular += irradiance");
  });
});
