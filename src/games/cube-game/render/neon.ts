import * as THREE from "three";

/**
 * The neon look, as two small shaders. Blocks get a dark body with a
 * bright rim of constant width on every face, however the block is
 * stretched, and faint tile lines inside. Spikes get a dark body with
 * glowing edges. Both brighten on the beat through `pulse` and fade
 * into the sky with distance, so the same material draws the backdrop.
 */

const FOG = /* glsl */ `
  uniform vec3 fogColor;
  uniform float fogDensity;
  vec3 fogged(vec3 colour, float depth) {
    return mix(colour, fogColor, 1.0 - exp(-depth * fogDensity));
  }
`;

export interface NeonUniforms {
  [name: string]: THREE.IUniform;
  fill: THREE.IUniform<THREE.Color>;
  edge: THREE.IUniform<THREE.Color>;
  pulse: THREE.IUniform<number>;
  glow: THREE.IUniform<number>;
  fogColor: THREE.IUniform<THREE.Color>;
  fogDensity: THREE.IUniform<number>;
  tile: THREE.IUniform<number>;
  windows: THREE.IUniform<number>;
  windowColour: THREE.IUniform<THREE.Color>;
}

function uniforms(fill: number, edge: number, glow: number): NeonUniforms {
  return {
    fill: { value: new THREE.Color(fill) },
    edge: { value: new THREE.Color(edge) },
    pulse: { value: 0 },
    glow: { value: glow },
    fogColor: { value: new THREE.Color(0x000000) },
    fogDensity: { value: 0 },
    tile: { value: 0.1 },
    windows: { value: 0 },
    windowColour: { value: new THREE.Color(0xffd48a) },
  };
}

export function blockMaterial(fill: number, edge: number, glow = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: uniforms(fill, edge, glow),
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      varying vec3 vSize;
      varying vec3 vNormal2;
      varying float vDepth;
      varying vec3 vWorld;
      void main() {
        mat4 world = modelMatrix;
        #ifdef USE_INSTANCING
          world = modelMatrix * instanceMatrix;
        #endif
        vSize = vec3(length(world[0].xyz), length(world[1].xyz), length(world[2].xyz));
        vLocal = position * vSize;
        vNormal2 = normal;
        vWorld = (world * vec4(position, 1.0)).xyz;
        vec4 view = viewMatrix * world * vec4(position, 1.0);
        vDepth = -view.z;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 fill;
      uniform vec3 edge;
      uniform float pulse;
      uniform float glow;
      uniform float tile;
      uniform float windows;
      uniform vec3 windowColour;
      varying vec3 vLocal;
      varying vec3 vSize;
      varying vec3 vNormal2;
      varying float vDepth;
      varying vec3 vWorld;
      ${FOG}
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 n = abs(vNormal2);
        vec2 uv = n.x > 0.5 ? vLocal.zy : n.y > 0.5 ? vLocal.xz : vLocal.xy;
        vec2 halfSize = 0.5 * (n.x > 0.5 ? vSize.zy : n.y > 0.5 ? vSize.xz : vSize.xy);
        vec2 inside = halfSize - abs(uv);
        float e = min(inside.x, inside.y);
        float rim = 1.0 - smoothstep(0.035, 0.075, e);
        float halo = exp(-e * 9.0);
        vec2 cell = abs(fract(uv + halfSize) - 0.5);
        float tiles = smoothstep(0.455, 0.49, max(cell.x, cell.y));
        float shade = n.y > 0.5 ? (vNormal2.y > 0.0 ? 1.5 : 0.55) : n.x > 0.5 ? 0.7 : 1.0;
        float lift = 0.75 + 0.35 * clamp(uv.y / max(halfSize.y, 0.001) * 0.5 + 0.5, 0.0, 1.0);
        vec3 colour = fill * shade * lift;
        colour += edge * glow * (rim * (1.15 + pulse * 1.0) + halo * (0.22 + pulse * 0.35) + tiles * tile);
        if (windows > 0.0 && vNormal2.z > 0.5) {
          // Lit windows in the skyline's towers, a few flickering with the beat.
          vec2 grid = vec2(vWorld.x * 1.2, vWorld.y * 0.9);
          vec2 cell = floor(grid);
          vec2 inCell = fract(grid);
          float pane = step(0.25, inCell.x) * step(inCell.x, 0.75) * step(0.3, inCell.y) * step(inCell.y, 0.75);
          float lit = step(0.62, hash(cell + floor(vWorld.z)));
          float inside = step(0.4, e);
          colour += windowColour * pane * lit * inside * windows * (0.8 + pulse * 0.4 * step(0.9, hash(cell * 1.7)));
        }
        gl_FragColor = vec4(fogged(colour, vDepth), 1.0);
      }
    `,
  });
}

/** A four sided pyramid with each face's corners marked, so the shader can light its edges. */
export function spikeGeometry(): THREE.BufferGeometry {
  const apex = [0, 0.95, 0];
  const corners = [
    [-0.45, 0, 0.45],
    [0.45, 0, 0.45],
    [0.45, 0, -0.45],
    [-0.45, 0, -0.45],
  ];
  const positions: number[] = [];
  const marks: number[] = [];
  for (let i = 0; i < 4; i++) {
    positions.push(...corners[i]!, ...corners[(i + 1) % 4]!, ...apex);
    marks.push(1, 0, 0, 0, 1, 0, 0, 0, 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("mark", new THREE.Float32BufferAttribute(marks, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** `rim` is the glowing edge's width as a share of each face, smaller for the huge pyramids of the skyline. */
export function spikeMaterial(fill: number, edge: number, rim = 0.06): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniforms(fill, edge, 1), rimWidth: { value: rim } },
    vertexShader: /* glsl */ `
      attribute vec3 mark;
      varying vec3 vMark;
      varying vec3 vNormal2;
      varying float vDepth;
      void main() {
        mat4 world = modelMatrix;
        #ifdef USE_INSTANCING
          world = modelMatrix * instanceMatrix;
        #endif
        vMark = mark;
        vNormal2 = normalize(mat3(world) * normal);
        vec4 view = viewMatrix * world * vec4(position, 1.0);
        vDepth = -view.z;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 fill;
      uniform vec3 edge;
      uniform float pulse;
      uniform float glow;
      uniform float rimWidth;
      varying vec3 vMark;
      varying vec3 vNormal2;
      varying float vDepth;
      ${FOG}
      void main() {
        float e = min(vMark.x, min(vMark.y, vMark.z));
        float rim = 1.0 - smoothstep(rimWidth * 0.5, rimWidth * 1.5, e);
        float light = 0.55 + 0.45 * max(0.0, dot(vNormal2, normalize(vec3(-0.3, 0.8, 0.6))));
        vec3 colour = fill * light * 1.4 + edge * glow * (rim * (1.9 + pulse * 1.4) + exp(-e * 0.6 / rimWidth) * 0.3);
        gl_FragColor = vec4(fogged(colour, vDepth), 1.0);
      }
    `,
  });
}

/** Points the fog of these materials at a colour and density, to match the sky. */
export function setFog(material: THREE.ShaderMaterial, colour: number, density: number): void {
  (material.uniforms.fogColor!.value as THREE.Color).set(colour);
  material.uniforms.fogDensity!.value = density;
}
