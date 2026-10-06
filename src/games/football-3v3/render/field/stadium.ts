import * as THREE from "three";
import type { MatchView } from "../../engine/view";
import { BOWL } from "./bowl";
import { Crowd } from "./crowd";
import { GoalPosts } from "./goal-posts";
import { KickNets } from "./kick-net";
import { LampBanks } from "./lamp-banks";
import { sidelineGeometry } from "./sideline";
import { nightSky } from "./sky";
import { stands, type Stands } from "./stands";
import { turf, type Turf } from "./turf";

/**
 * The whole venue: the turf with its paint, both goal posts and kicking
 * nets, the team areas and pylons, the two decked stands with the suites
 * and the LED rail between them, the roof with its floodlight banks and
 * their glare, the crowd and the night sky. Everything that never moves,
 * plus the crowd's excitement and the posts and nets reacting to the ball.
 */
export class Stadium {
  readonly group = new THREE.Group();
  readonly crowd: Crowd | null;
  readonly lamps: LampBanks;
  private readonly turf: Turf;
  private readonly stands: Stands;
  private readonly posts: GoalPosts;
  private readonly nets: KickNets;
  private readonly shared: THREE.MeshStandardMaterial;
  private readonly sideline: THREE.Mesh;
  private readonly sky: THREE.Mesh;

  constructor(low: boolean, maxAnisotropy: number) {
    // One vertex coloured material for every small painted part on the ground.
    this.shared = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.05 });
    // The turf runs right out under the front wall, so no edge ever shows.
    this.turf = turf(BOWL.a * 2 + 4, BOWL.b * 2 + 4, maxAnisotropy, low);
    this.posts = new GoalPosts(this.shared);
    this.nets = new KickNets(this.shared);
    this.sideline = new THREE.Mesh(sidelineGeometry(), this.shared);
    this.sideline.castShadow = !low;
    this.sideline.receiveShadow = !low;
    this.stands = stands(low);
    this.lamps = new LampBanks();
    this.sky = nightSky();
    this.crowd = low ? null : new Crowd();
    this.group.add(this.sky, this.turf.mesh, this.posts.group, this.nets.group, this.sideline, this.lamps.group, ...this.stands.meshes);
    if (this.crowd) this.group.add(this.crowd.mesh);
  }

  /** The posts shake and the nets bulge when the ball hits them, the nets go up for kicks, and the crowd follows `excitement`. */
  update(view: MatchView, time: number, dt: number, excitement: number): void {
    this.crowd?.setExcitement(excitement);
    this.crowd?.update(time, dt);
    this.posts.update(view.ball.goal);
    this.nets.update(view.ball.goal, view.kick !== null, dt);
  }

  dispose(): void {
    this.turf.dispose();
    this.stands.dispose();
    this.lamps.dispose();
    this.nets.dispose();
    this.crowd?.dispose();
    this.sideline.geometry.dispose();
    this.sky.geometry.dispose();
    (this.sky.material as THREE.Material).dispose();
    this.posts.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.shared.dispose();
  }
}
