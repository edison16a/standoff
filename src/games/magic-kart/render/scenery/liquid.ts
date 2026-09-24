import * as THREE from "three";

export interface LiquidStyle {
  shallow: string;
  deep: string;
  /** Bright crests: sea foam, or the hot skin on lava. */
  crest: string;
  /** Lava glows on its own; water is lit by the fog colour. */
  glow: boolean;
  /** How big the swell pattern is, in metres. */
  scale: number;
}

/**
 * A flat surface that moves: gentle sea swell with foam lines, or slow
 * lava with bright cracks. One shader for both, since both are just two
 * colours mixed by drifting waves, and it keeps the fog so the far sea
 * melts into the sky.
 */
export function liquidMaterial(style: LiquidStyle): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        time: { value: 0 },
        shallow: { value: new THREE.Color(style.shallow) },
        deep: { value: new THREE.Color(style.deep) },
        crest: { value: new THREE.Color(style.crest) },
        scale: { value: style.scale },
        glow: { value: style.glow ? 1 : 0 },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float time;
      uniform vec3 shallow;
      uniform vec3 deep;
      uniform vec3 crest;
      uniform float scale;
      uniform float glow;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz / scale;
        float w = sin(p.x * 1.7 + time * 0.8) * 0.5 + sin(p.y * 2.3 - time * 0.6) * 0.5;
        w += sin((p.x + p.y) * 3.1 + time * 1.3) * 0.35;
        float band = smoothstep(0.55, 0.95, sin(p.x * 0.9 + p.y * 0.6 + w * 1.4 + time * 0.5));
        vec3 col = mix(deep, shallow, 0.5 + 0.25 * w);
        col = mix(col, crest, band * (glow > 0.5 ? 0.8 : 0.35));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

/** A big flat sheet of liquid, for the sea, a lagoon or a lava lake. */
export function liquidSheet(material: THREE.ShaderMaterial, width: number, depth: number, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2), material);
  mesh.position.set(x, y, z);
  return mesh;
}
