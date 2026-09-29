import * as THREE from "three";

/**
 * A light shaft through hazy air: additive, brightest near the lamp and
 * fading toward the floor, and soft at its edges, where you look through
 * less of the lit air. Drawn on an open cone.
 */
export function beamMaterial(colour: THREE.ColorRepresentation, haze: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { colour: { value: new THREE.Color(colour) }, haze: { value: haze }, level: { value: 1 } },
    vertexShader: /* glsl */ `
      varying float vAlong;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        // The cone runs from its tip at y 0 down to y -1.
        vAlong = -position.y;
        vec4 world = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-world.xyz);
        gl_Position = projectionMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 colour;
      uniform float haze;
      uniform float level;
      varying float vAlong;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = abs(dot(normalize(vNormal), normalize(vView)));
        float edge = pow(facing, 2.2);
        float fade = smoothstep(0.0, 0.08, vAlong) * pow(1.0 - vAlong, 2.6);
        gl_FragColor = vec4(colour * edge * fade * haze * 0.16 * level, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
