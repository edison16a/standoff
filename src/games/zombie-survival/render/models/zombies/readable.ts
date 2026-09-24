import * as THREE from "three";

/** A cold moonlit edge on every zombie, so its outline reads against the dark street. */
const RIM = { value: new THREE.Color(0x6f8fb8).multiplyScalar(0.34) };
/** Zombies cut through the fog this much more than the city does, so they read from further off. */
const FOG_REACH = 0.55;

/**
 * Makes a zombie material read in the dark without lifting the whole
 * scene: a fresnel rim that lights the silhouette's edge, and a thinner
 * fog than the buildings get. The street stays murky; the dead stand out
 * of it. Every zombie material shares one program, so this costs nothing
 * per zombie.
 */
export function makeReadable<T extends THREE.MeshStandardMaterial>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.zsRim = RIM;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 zsRim;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float zsEdge = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
        totalEmissiveRadiance += zsRim * pow( zsEdge, 3.2 );`,
      )
      .replace(
        "#include <fog_fragment>",
        `#ifdef USE_FOG
          float zsDepth = vFogDepth * ${FOG_REACH.toFixed(2)};
          #ifdef FOG_EXP2
            float fogFactor = 1.0 - exp( - fogDensity * fogDensity * zsDepth * zsDepth );
          #else
            float fogFactor = smoothstep( fogNear, fogFar, zsDepth );
          #endif
          gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
        #endif`,
      );
  };
  material.customProgramCacheKey = () => "zs-readable";
  return material;
}
