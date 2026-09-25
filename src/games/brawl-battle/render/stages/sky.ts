import * as THREE from "three";

const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uLow;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform float uSunSize;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 c = h > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.55, h)) : mix(uMid, uLow, smoothstep(0.0, 0.4, -h));
  float d = dot(normalize(vDir), normalize(uSunDir));
  c += uSun * (smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.6, d) + pow(max(d, 0.0), 24.0) * 0.35);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export interface SkyLook {
  top: string;
  mid: string;
  low: string;
  /** A sun or moon, or black for none. */
  sun: string;
  sunDir: readonly [number, number, number];
  sunSize: number;
}

/**
 * A big sphere painted with a three colour gradient and a soft sun,
 * drawn behind everything. It follows the camera so it never gets close.
 */
export function buildSky(look: SkyLook): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTop: { value: new THREE.Color(look.top) },
      uMid: { value: new THREE.Color(look.mid) },
      uLow: { value: new THREE.Color(look.low) },
      uSun: { value: new THREE.Color(look.sun) },
      uSunDir: { value: new THREE.Vector3(...look.sunDir) },
      uSunSize: { value: look.sunSize },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), mat);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  return sky;
}
