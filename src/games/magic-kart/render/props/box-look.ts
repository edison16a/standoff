import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Cube } from "../../engine/pickups";
import { starShape } from "../models/geo";
import { BOX_SIZE } from "./box-motion";

/** Single boxes run through the rainbow along a row; a double box is always gold, to spot from afar. */
const TINTS = ["#5fd8ff", "#ff7eb6", "#ffd23f", "#6cf08a", "#c77dff", "#ffb347"];
const GOLD = "#ffc23a";

export function boxTint(cube: Cube, index: number): string {
  return cube.count === 2 ? GOLD : TINTS[index % TINTS.length]!;
}

/** A cube with softly rounded edges, so the glass catches a highlight along every one. */
export function shellGeometry(): THREE.BufferGeometry {
  return new RoundedBoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE, 3, 0.17);
}

/** A plump star with bevelled edges for the mark floating inside each cube. */
export function markGeometry(): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(starShape(0.44, 0.2), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 3, curveSegments: 4 });
  return g.center();
}

/**
 * The glass: a clear shell with a soap film shimmer that reflects the
 * map's own sky, more opaque towards its rim the way real glass is, and
 * a glowing frame along all twelve edges in the box's colour. The far
 * side is drawn too, so its edges glow through the near faces.
 */
export function glassMaterial(environment: THREE.Texture | null): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    vertexColors: false,
    transparent: true,
    opacity: 0.1,
    roughness: 0.04,
    metalness: 0,
    ior: 2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.04,
    iridescence: 1,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [180, 760],
    envMap: environment,
    envMapIntensity: 1.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHalf = { value: BOX_SIZE / 2 };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vBoxLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBoxLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vBoxLocal;\nuniform float uHalf;")
      // The glass itself is only faintly tinted; the colour lives in the frame and the mark.
      .replace("#include <color_fragment>", "#include <color_fragment>\nvec3 boxTint = diffuseColor.rgb;\ndiffuseColor.rgb = mix(vec3(1.0), boxTint, 0.55) * 0.35;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        // Near an edge, the second largest of the three local coordinates comes close to the half size.
        vec3 boxA = abs(vBoxLocal) / uHalf;
        float boxHi = max(boxA.x, max(boxA.y, boxA.z));
        float boxMid = boxA.x + boxA.y + boxA.z - boxHi - min(boxA.x, min(boxA.y, boxA.z));
        float boxFrame = smoothstep(0.84, 0.93, boxMid);
        float boxBack = gl_FrontFacing ? 1.0 : 0.6;
        // A glowing frame in the box's colour, white hot along the very edge, and a faint glow in the glass.
        totalEmissiveRadiance += (boxTint * 1.5 + vec3(0.35) * smoothstep(0.93, 0.99, boxMid)) * boxFrame * boxBack;
        totalEmissiveRadiance += boxTint * 0.07 * (1.0 - boxFrame);
        // A soap film shimmer: the rim runs through the rainbow as the box turns.
        float boxView = abs(dot(normalize(normal), normalize(vViewPosition)));
        float boxHue = fract(boxView * 1.7 + dot(vBoxLocal, vec3(0.35, 0.5, 0.25)));
        vec3 boxFilm = 0.5 + 0.5 * cos(6.28318 * (boxHue + vec3(0.0, 0.33, 0.67)));
        totalEmissiveRadiance += boxFilm * pow(1.0 - boxView, 2.0) * 0.32 * (1.0 - boxFrame);`,
      )
      .replace(
        "#include <opaque_fragment>",
        `#include <opaque_fragment>
        float boxFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
        float boxRim = pow(1.0 - boxFacing, 3.0);
        float boxShine = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        gl_FragColor.a = clamp(diffuseColor.a + boxRim * 0.35 + boxFrame * 0.9 + boxShine * 0.22, 0.0, 1.0);`,
      );
  };
  material.customProgramCacheKey = () => "magic-kart-box-glass-1";
  return material;
}

const BILLBOARD_VERTEX = `
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vFade;
  void main() {
    vUv = uv;
    vTint = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vTint = instanceColor;
    #endif
    // Each instance is a square facing the camera, sized by its matrix, so every split screen view sees it face on.
    vec4 centre = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float size = length(instanceMatrix[0].xyz);
    centre.xy += position.xy * size;
    // A camera passing right by a box must not be blinded by its light.
    vFade = smoothstep(1.5, 5.0, -centre.z);
    gl_Position = projectionMatrix * centre;
  }`;

/**
 * The light inside a box: a soft glow with a four point twinkle across
 * it, brightest at the heart. Additive, so it lights the glass from
 * within. The instance colour sets its tint and strength.
 */
export function haloMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: BILLBOARD_VERTEX,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vTint;
      varying float vFade;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float glow = exp(-r * r * 5.0) * 0.7 + exp(-r * r * 40.0) * 1.0;
        float twinkle = exp(-abs(p.x) * 26.0) * exp(-abs(p.y) * 2.6) + exp(-abs(p.y) * 26.0) * exp(-abs(p.x) * 2.6);
        vec3 c = vTint * (glow + twinkle * 0.7) + vTint * exp(-r * r * 60.0) * 0.6;
        gl_FragColor = vec4(c * smoothstep(1.0, 0.7, r) * vFade, 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * The mark: a star that glows white hot at its heart and takes the box's
 * colour towards its points, with a bright rim as it turns edge on.
 */
export function markMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vLocal;
      varying vec3 vTint;
      varying vec3 vNormalV;
      varying vec3 vView;
      void main() {
        vLocal = position;
        vTint = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vTint = instanceColor;
        #endif
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vLocal;
      varying vec3 vTint;
      varying vec3 vNormalV;
      varying vec3 vView;
      void main() {
        float heart = 1.0 - smoothstep(0.05, 0.42, length(vLocal.xy));
        float rim = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vView))), 2.0);
        vec3 c = mix(vTint * 1.25, vec3(1.0, 0.98, 0.92) * 1.6, heart) + vTint * rim * 0.8;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
