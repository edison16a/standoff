import * as THREE from "three";

/**
 * Shared models and the pool of their copies. A prefab is built once per
 * key; the yard takes copies as chunks and obstacles come into view and
 * gives them back as they fall behind, so a long run allocates next to
 * nothing and the collector never stalls a frame.
 */
const sources = new Map<string, THREE.Object3D>();
const free = new Map<string, THREE.Object3D[]>();
const materials = new Map<string, THREE.Material>();

/** Copies kept per key. More than a screenful of one piece is never needed. */
const KEEP = 48;

/** A copy of the prefab under `key`, from the pool when one is spare, built on first use. */
export function prefab<T extends THREE.Object3D>(key: string, build: () => T): T {
  const spare = free.get(key)?.pop();
  if (spare) return spare as T;
  let source = sources.get(key);
  if (!source) {
    source = build();
    // Copies share the source's geometry, so nothing but the source may free it.
    source.traverse((node) => (node.userData.sharedGeometry = true));
    sources.set(key, source);
  }
  const copy = source.clone();
  copy.userData.prefab = key;
  return copy as T;
}

/** Hands a copy back to the pool, reset to stand at the origin. Anything not from `prefab` is just detached. */
export function release(object: THREE.Object3D): void {
  object.removeFromParent();
  const key = object.userData.prefab as string | undefined;
  if (!key) return;
  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  object.visible = true;
  let list = free.get(key);
  if (!list) free.set(key, (list = []));
  if (list.length < KEEP && !list.includes(object)) list.push(object);
}

/** How many copies of a key wait in the pool, for tests. */
export function spareCount(key: string): number {
  return free.get(key)?.length ?? 0;
}

/** A material made once per key and shared by every model that asks for it. */
export function textured(key: string, make: () => THREE.Material): THREE.Material {
  let material = materials.get(key);
  if (!material) {
    material = make();
    material.userData.shared = true;
    materials.set(key, material);
  }
  return material;
}

/** A copy of a shared texture tiled `x` by `y` times. The copy shares the picture. */
export function repeated(texture: THREE.Texture, key: string, x: number, y: number): THREE.Texture {
  const copy = texture.clone();
  copy.repeat.set(x, y);
  copy.needsUpdate = true;
  copy.userData.shared = true;
  copy.name = key;
  return copy;
}
