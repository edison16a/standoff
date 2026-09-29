import * as THREE from "three";
import type { AthleteView, BallView, RefereeView } from "../../engine/view";
import { ROSTER, type Character, type Kit } from "../../roster";
import { smooth } from "../anim/frame";
import { AthleteFigure } from "./athlete-figure";

/** The referee's kit: all black with a touch of lime, as referees wear. */
const KIT: Kit = { shirt: "#141414", trim: "#c6f432", shorts: "#141414", socks: "#141414", ink: "#141414" };

/** Nobody famous: a fit official in his forties, built like a runner. */
const REFEREE: Character = {
  ...ROSTER.echeverri,
  name: "Referee",
  short: "",
  number: 0,
  look: { skin: "#d7a883", hair: "#3b2a1f", hairStyle: "buzz", beard: "stubble", height: 1.82, build: 0.5, boots: "#111111", kit: KIT },
  foot: "right",
};

/** How long the arm takes to go up with the card. */
const RAISE = 0.35;

/**
 * The referee on the pitch. He runs with the same legs as the players,
 * and to book someone he stops, faces them and thrusts the yellow card
 * straight up above his head.
 */
export class RefereeFigure {
  readonly group = new THREE.Group();
  private readonly figure: AthleteFigure;
  private readonly card: THREE.Mesh;

  constructor(material: THREE.Material) {
    this.figure = new AthleteFigure(asAthlete(null), KIT, material, REFEREE);
    this.group.add(this.figure.rig.root);
    this.card = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.105, 0.006), new THREE.MeshStandardMaterial({ color: "#ffd400", emissive: "#a88a00", emissiveIntensity: 0.5, roughness: 0.4 }));
    // Held upright between the fingers, face toward the player being booked.
    this.card.position.set(0, -0.07, 0.03);
    this.card.visible = false;
    this.figure.rig.handR.add(this.card);
  }

  update(view: RefereeView, ball: BallView, dt: number, time: number): void {
    this.figure.update(asAthlete(view), ball, dt, time);
    const carding = view.action === "card";
    this.card.visible = carding;
    if (!carding) return;
    const up = smooth(view.actionT / RAISE);
    const rig = this.figure.rig;
    // Straight up above the head, arm locked, the other arm easing down by his side.
    rig.shoulderR.rotation.x += (-3.05 - rig.shoulderR.rotation.x) * up;
    rig.shoulderR.rotation.z += (-0.12 - rig.shoulderR.rotation.z) * up;
    rig.elbowR.rotation.x *= 1 - up;
    rig.shoulderL.rotation.x += (0.1 - rig.shoulderL.rotation.x) * up;
  }

  dispose(): void {
    this.figure.dispose();
    this.card.geometry.dispose();
    (this.card.material as THREE.Material).dispose();
  }
}

/** The referee as a player still, so he moves with the same running and standing as everyone. */
function asAthlete(r: RefereeView | null): AthleteView {
  return {
    id: 99,
    team: 0,
    character: "echeverri",
    seat: null,
    x: r?.x ?? 0,
    z: r?.z ?? 0,
    facing: r?.facing ?? 0,
    speed: r?.speed ?? 0,
    stride: r?.stride ?? 0,
    action: "free",
    actionT: r?.actionT ?? 0,
    actionLen: 0,
    power: 0,
    hasBall: false,
    bar: false,
    charge: 0,
    skill: null,
    skillSide: 1,
    signature: false,
    guarding: false,
    wall: false,
  };
}
