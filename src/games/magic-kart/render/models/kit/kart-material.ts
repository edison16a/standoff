import * as THREE from "three";

/**
 * The one material a kart is drawn with. It is a physical material with
 * a clear coat, but roughness, metalness, coat and glow come from each
 * vertex (see finish.ts), so painted bodywork, chrome pipes, rubber tyres
 * and lit lamps all draw in one pass. Three glow channels follow uniforms
 * the model sets each frame: exhaust heat, brake lights and headlights.
 */
export interface KartMaterial extends THREE.MeshPhysicalMaterial {
  userData: {
    heat: { value: number };
    brake: { value: number };
    head: { value: number };
  };
}

export function kartMaterial(map: THREE.Texture | null): KartMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    map,
    roughness: 0.5,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    // Decals with see through edges are cut out; everything else is solid.
    alphaTest: 0.5,
  }) as KartMaterial;
  material.userData = { heat: { value: 0 }, brake: { value: 0.35 }, head: { value: 1 } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHeat = material.userData.heat;
    shader.uniforms.uBrake = material.userData.brake;
    shader.uniforms.uHead = material.userData.head;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 finish;\nvarying vec4 vFinish;")
      .replace("#include <color_vertex>", "#include <color_vertex>\nvFinish = finish;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec4 vFinish;\nuniform float uHeat;\nuniform float uBrake;\nuniform float uHead;")
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = vFinish.x;")
      .replace("#include <metalnessmap_fragment>", "float metalnessFactor = vFinish.y;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float glowChannel = floor(vFinish.w / 16.0 + 0.001);
        float glowAmount = vFinish.w - glowChannel * 16.0;
        float glowLevel = glowChannel < 0.5 ? 1.0 : glowChannel < 1.5 ? uHeat : glowChannel < 2.5 ? uBrake : uHead;
        totalEmissiveRadiance += diffuseColor.rgb * glowAmount * glowLevel;`,
      )
      .replace(
        "#include <lights_physical_fragment>",
        `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
          material.clearcoat *= vFinish.z;
        #endif`,
      );
  };
  // Every kart shares the one compiled program.
  material.customProgramCacheKey = () => "magic-kart-finish-1";
  return material;
}
