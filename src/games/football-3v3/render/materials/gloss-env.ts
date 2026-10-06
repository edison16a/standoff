import * as THREE from "three";

/**
 * What glossy gear reflects: a night sky, a dark bowl of stands, the
 * bright banks of the floodlights high on four sides and green turf
 * below. Helmets and visors pick these up as hard streaks of light, the
 * way a polished shell looks under a night game. Built once per renderer.
 */
export function glossEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `varying vec3 vDir;
        void main() {
          float up = vDir.y;
          vec3 sky = mix(vec3(0.05, 0.07, 0.16), vec3(0.01, 0.015, 0.05), smoothstep(0.1, 0.9, up));
          vec3 stands = vec3(0.07, 0.07, 0.09);
          vec3 turf = vec3(0.06, 0.2, 0.07);
          vec3 c = up > 0.12 ? sky : up > -0.05 ? stands : turf;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  scene.add(sky);
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(14, 13, 11.5) });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const bank = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), lamp);
    bank.position.set(Math.sin(a) * 40, 22, Math.cos(a) * 40);
    bank.lookAt(0, 0, 0);
    scene.add(bank);
  }
  // A soft glow off the lit field fills the lower half.
  const glow = new THREE.Mesh(new THREE.CircleGeometry(30, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.55, 0.25) }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -6;
  scene.add(glow);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return env;
}
