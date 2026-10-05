import * as THREE from "three";

export type FlameStyle = "fire" | "plasma";

/** Colours from the nozzle out to the tip. */
const STYLES: Record<FlameStyle, { core: string; mid: string; tip: string }> = {
  fire: { core: "#fff6d8", mid: "#ffb02e", tip: "#ff3a12" },
  plasma: { core: "#f2fdff", mid: "#4fe6ff", tip: "#7a4dff" },
};

/** A boost flame's shape: an open cone from the nozzle (z 0) back to its tip (z -1). */
export function flameGeometry(): THREE.BufferGeometry {
  return new THREE.ConeGeometry(0.2, 1, 18, 8, true).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
}

/**
 * A boost flame that burns: hot white at the nozzle, through the flame
 * colour to a fading tip, licking and flickering as bands of heat race
 * down it, and brightest through its middle like a real jet of fire.
 * Additive, so overlapping flames glow hotter. One material per style,
 * shared by every kart; `time` drives the flicker.
 */
export function flameMaterial(style: FlameStyle, core = false): THREE.ShaderMaterial {
  const c = STYLES[style];
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      time: { value: 0 },
      core: { value: new THREE.Color(core ? "#ffffff" : c.core) },
      mid: { value: new THREE.Color(core ? c.core : c.mid) },
      tip: { value: new THREE.Color(core ? c.mid : c.tip) },
      strength: { value: core ? 1.3 : 1 },
    },
    vertexShader: /* glsl */ `
      uniform float time;
      varying float vT;
      varying float vFacing;
      varying float vAngle;
      void main() {
        vT = clamp(-position.z, 0.0, 1.0);
        vAngle = atan(position.y, position.x);
        vec3 p = position;
        // The flame wobbles more toward its tip, as a real one does in the wind.
        float wob = sin(time * 31.0 + vT * 9.0) * 0.05 + sin(time * 47.0 + vAngle * 3.0) * 0.03;
        p.xy *= 1.0 + wob * vT * 3.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFacing = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 core;
      uniform vec3 mid;
      uniform vec3 tip;
      uniform float strength;
      varying float vT;
      varying float vFacing;
      varying float vAngle;
      void main() {
        vec3 col = mix(core, mid, smoothstep(0.0, 0.32, vT));
        col = mix(col, tip, smoothstep(0.32, 0.9, vT));
        float bands = 0.65 + 0.35 * sin(vT * 26.0 - time * 55.0 + sin(vAngle * 4.0 + time * 9.0) * 1.5);
        float body = pow(vFacing, 1.4);
        float a = (1.0 - smoothstep(0.55, 1.0, vT)) * body * bands * strength;
        gl_FragColor = vec4(col * a * 1.6, a);
        #include <colorspace_fragment>
      }`,
  });
}
