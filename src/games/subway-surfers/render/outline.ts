import * as THREE from "three";

const VERTEX = /* glsl */ `
  uniform float thickness;
  #include <common>
  #include <fog_pars_vertex>
  void main() {
    vec3 grown = position + normalize(normal) * thickness;
    vec4 mvPosition = modelViewMatrix * vec4(grown, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 color;
  #include <common>
  #include <fog_pars_fragment>
  void main() {
    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`;

let material: THREE.ShaderMaterial | null = null;

/** One dark ink material for every outline, pushed out along the normals and drawn inside out. */
function ink(): THREE.ShaderMaterial {
  material ??= new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { thickness: { value: 0.011 }, color: { value: new THREE.Color(0x1b1530) } }]),
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    fog: true,
  });
  material.userData.shared = true;
  return material;
}

/**
 * Gives a character a cartoon ink line: each mesh gets a twin drawn
 * inside out and a hair larger, so only its rim shows round the edge.
 * The twin shares the mesh's geometry, so it costs a draw and no memory.
 */
export function addOutline(root: THREE.Object3D): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    // Glowing bits, like the glint in an eye, stay unlined.
    if (mesh.isMesh && !mesh.userData.outline && !(mesh.material instanceof THREE.MeshBasicMaterial)) meshes.push(mesh);
  });
  for (const mesh of meshes) {
    const twin = new THREE.Mesh(mesh.geometry, ink());
    twin.userData.outline = true;
    twin.userData.sharedGeometry = true;
    twin.renderOrder = mesh.renderOrder;
    mesh.add(twin);
  }
}
