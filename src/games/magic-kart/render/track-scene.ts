import * as THREE from "three";
import { buildPads } from "../engine/pickups";
import { Track } from "../engine/track";
import type { ThemeId, TrackDef } from "../tracks/types";
import { buildStartArch } from "./scenery/arches";
import { buildBeach } from "./scenery/beach";
import { buildCity } from "./scenery/city";
import type { Scenery } from "./scenery/scenery";
import { buildSky } from "./scenery/sky";
import { buildSpace } from "./scenery/space";
import { buildVolcano } from "./scenery/volcano";
import { THEMES, type Theme } from "./themes";
import { buildMarkings } from "./track/markings";
import { buildRoad } from "./track/road-mesh";

const SCENERY: Record<ThemeId, (track: Track) => Scenery> = {
  beach: buildBeach,
  space: buildSpace,
  city: buildCity,
  volcano: buildVolcano,
};

/**
 * Everything on a map that does not race: the road and its markings, the
 * start arch, the scenery, the sky and the light. Built once when the map
 * is picked and shared by every player's view.
 */
export class TrackScene {
  readonly scene = new THREE.Scene();
  readonly track: Track;
  readonly theme: Theme;
  readonly sky: THREE.Mesh;
  private readonly updates: ((time: number) => void)[] = [];

  constructor(readonly def: TrackDef) {
    this.track = new Track(def);
    this.theme = THEMES[def.theme];
    const theme = this.theme;
    this.scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    this.scene.background = new THREE.Color(theme.fog);
    const sunDir = new THREE.Vector3(-0.5, 0.8, 0.35);
    this.sky = buildSky(theme, sunDir, def.theme === "space" ? 1 : def.theme === "city" ? 0.35 : 0);
    this.scene.add(this.sky);
    this.scene.add(new THREE.HemisphereLight(theme.ambientSky, theme.ambientGround, theme.ambient));
    const sun = new THREE.DirectionalLight(theme.sun, theme.sunIntensity);
    sun.position.copy(sunDir).multiplyScalar(100);
    this.scene.add(sun);

    this.scene.add(buildRoad(this.track, theme));
    const markings = buildMarkings(this.track, theme, buildPads(this.track));
    this.scene.add(markings.group);
    this.updates.push(markings.update);
    this.scene.add(buildStartArch(this.track, def.theme));
    const scenery = SCENERY[def.theme](this.track);
    this.scene.add(scenery.group);
    this.updates.push(scenery.update);
  }

  /** Moves the water, the pads and the scenery. Once a frame. */
  animate(time: number): void {
    for (const update of this.updates) update(time);
  }

  /** Keeps the sky centred on whichever camera is about to draw. */
  follow(camera: THREE.Camera): void {
    this.sky.position.copy(camera.position);
  }

  /** Frees every geometry, material and texture the map made. */
  dispose(): void {
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
        const uniforms = (material as THREE.ShaderMaterial).uniforms;
        if (uniforms) for (const u of Object.values(uniforms)) if (u.value instanceof THREE.Texture) u.value.dispose();
        material.dispose();
      }
    });
  }
}
