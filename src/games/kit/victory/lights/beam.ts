import * as THREE from "three";

/**
 * The visible shaft of a spotlight through hazy air: an open cone, bright
 * near the lamp and fading to nothing at the floor, soft at its edges so
 * it never shows its outline. Drawn additively, so beams crossing each
 * other glow brighter, as they do in a real arena.
 */
export function beamMaterial(colour: THREE.ColorRepresentation, strength = 0.35): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { colour: { value: new THREE.Color(colour) }, strength: { value: strength } },
    vertexShader: /* glsl */ `
      varying float vAlong;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vAlong = uv.y;
        vec4 world = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-world.xyz);
        gl_Position = projectionMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 colour;
      uniform float strength;
      varying float vAlong;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.6);
        float fade = pow(vAlong, 1.8);
        gl_FragColor = vec4(colour * strength * edge * fade, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/**
 * A cone one metre long with its tip at the origin, opening down -y to a
 * radius of `spread` at the far end. uv.y is 1 at the tip and 0 at the
 * far end, which is what the beam fades on.
 */
export function beamGeometry(spread: number): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.02, spread, 1, 40, 1, true);
  geometry.translate(0, -0.5, 0);
  return geometry;
}
