import * as THREE from "three";
import { FIELD } from "../../engine/field";
import { deckTop, LOWER, ROOF, SUITES, UPPER } from "../field/bowl";
import { banks, LAMP_PITCH } from "../field/light-rig";
import { deckProfile, ringStrip } from "../field/ring-strip";

/** Radiance of a lamp face as the environment sees it. Bright enough to streak a helmet, not so bright it floods the fill. */
const LAMP = new THREE.Color(14, 13.2, 11.8);

const basic = (color: THREE.ColorRepresentation, side: THREE.Side = THREE.FrontSide) => new THREE.MeshBasicMaterial({ color, side });

/** A night sky, deep blue overhead, hazy and lit up near the roof by the stadium's own glow. */
function sky(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `varying vec3 vDir;
        void main() {
          float up = max(vDir.y, 0.0);
          vec3 c = mix(vec3(0.05, 0.06, 0.09), vec3(0.008, 0.012, 0.03), smoothstep(0.0, 0.7, up));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
}

/**
 * What everything shiny on the field mirrors, and the soft fill from all
 * round: the lit turf below with its paler field, the dark decks with the
 * warm glow of the suites, the roof, every floodlight bank where it
 * really hangs, and the sky. Built once per renderer from the same
 * shapes as the stadium, from a player's chest height at midfield.
 */
export function stadiumEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  scene.add(sky());
  // The turf lit by the floods; the field itself a touch brighter than the sideline.
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), basic(new THREE.Color(0.035, 0.1, 0.03)));
  apron.rotation.x = -Math.PI / 2;
  const field = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.endX * 2, FIELD.halfWidth * 2), basic(new THREE.Color(0.06, 0.17, 0.05)));
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.01;
  scene.add(apron, field);
  const ring = (profile: [number, number][], color: THREE.ColorRepresentation) => scene.add(new THREE.Mesh(ringStrip(profile, { segments: 64 }), basic(color, THREE.DoubleSide)));
  ring([[0, 0], [0, LOWER.base]], new THREE.Color(0.02, 0.02, 0.025));
  ring(deckProfile({ ...LOWER, rows: 6, rowDepth: LOWER.rowDepth * 4.33, rowRise: LOWER.rowRise * 4.33 }), new THREE.Color(0.03, 0.03, 0.04));
  const low = deckTop(LOWER);
  ring([[low.out, low.y], [low.out, low.y + 1.4]], new THREE.Color(0.25, 0.12, 0.1));
  ring([[SUITES.out, SUITES.bottom], [SUITES.out, SUITES.top]], new THREE.Color(0.3, 0.2, 0.12));
  ring(deckProfile({ ...UPPER, rows: 5, rowDepth: UPPER.rowDepth * 4, rowRise: UPPER.rowRise * 4 }), new THREE.Color(0.025, 0.025, 0.035));
  const top = deckTop(UPPER);
  ring([[top.out, top.y], [ROOF.back, ROOF.y]], new THREE.Color(0.012, 0.012, 0.016));
  ring([[ROOF.back, ROOF.y - ROOF.thickness], [ROOF.inner, ROOF.y - ROOF.thickness]], new THREE.Color(0.02, 0.02, 0.025));
  const lamp = basic(LAMP, THREE.DoubleSide);
  for (const bank of banks()) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(bank.cols * LAMP_PITCH, bank.rows * LAMP_PITCH * 0.9), lamp);
    panel.position.copy(bank.centre);
    panel.lookAt(bank.aim);
    scene.add(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.015, 0.5, 600, { position: new THREE.Vector3(0, 1.5, 0) }).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return env;
}
