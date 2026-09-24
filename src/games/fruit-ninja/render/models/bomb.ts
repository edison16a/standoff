import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { glowTexture } from "../textures/sprites";

/**
 * The bomb from the cover: a glossy black ball with a metal collar, a
 * braided fuse and a spark fizzing at its tip. The spark is named, so the
 * renderer can make each copy flicker on its own.
 */
export function buildBomb(): Group {
  const bomb = new Group();
  const shell = new MeshPhysicalMaterial({ color: new Color("#141416"), roughness: 0.22, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const metal = new MeshStandardMaterial({ color: new Color("#4a4a50"), roughness: 0.3, metalness: 0.9 });
  const rope = new MeshStandardMaterial({ color: new Color("#d8c08a"), roughness: 0.8 });

  const body = new Mesh(new SphereGeometry(1, 48, 32), shell);
  body.castShadow = true;
  bomb.add(body);

  const collar = new Mesh(new CylinderGeometry(0.34, 0.38, 0.26, 32), metal);
  collar.position.y = 0.98;
  collar.castShadow = true;
  bomb.add(collar);
  const rim = new Mesh(new TorusGeometry(0.34, 0.045, 10, 32), metal);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.11;
  bomb.add(rim);

  // Rivets around the collar catch the light.
  const rivet = new SphereGeometry(0.04, 8, 6);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = new Mesh(rivet, metal);
    r.position.set(Math.sin(a) * 0.37, 0.98, Math.cos(a) * 0.37);
    bomb.add(r);
  }

  const curve = new CatmullRomCurve3([new Vector3(0, 1.05, 0), new Vector3(0.05, 1.35, 0), new Vector3(0.22, 1.6, 0.04), new Vector3(0.45, 1.7, 0.06)]);
  const fuse = new Mesh(new TubeGeometry(curve, 20, 0.055, 8, false), rope);
  fuse.castShadow = true;
  bomb.add(fuse);

  const spark = new Sprite(
    new SpriteMaterial({ map: glowTexture(), color: new Color("#ffc05a"), blending: AdditiveBlending, depthWrite: false, transparent: true }),
  );
  spark.name = "spark";
  spark.position.set(0.47, 1.72, 0.06);
  spark.scale.setScalar(0.9);
  bomb.add(spark);
  const core = new Sprite(new SpriteMaterial({ map: glowTexture(), color: new Color("#ffffff"), blending: AdditiveBlending, depthWrite: false }));
  core.name = "spark-core";
  core.position.copy(spark.position);
  core.scale.setScalar(0.3);
  bomb.add(core);
  return bomb;
}
