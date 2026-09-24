import { Group, Mesh, type BufferGeometry, type Material, type Object3D } from "three";
import { acrossCap, alongCap, middleT, revolve, weldNormals, type RevolveShape } from "./revolve";

/** A stem, leaf or crown, and which half keeps it once the fruit is cut. */
export interface Attachment {
  object: Object3D;
  half: "a" | "b";
}

/**
 * Everything needed to build one kind of fruit: its shape, how it is
 * cut, its peel and flesh, and the bits stuck on it.
 */
export interface FruitSpec {
  shape: RevolveShape;
  /** Across the axis shows a round slice (orange). Along it shows the core (apple). */
  cut: "across" | "along";
  /** The model's size, in its own units, that matches the hit radius. */
  fit: number;
  skin(): Material;
  flesh(): Material;
  attachments?(): Attachment[];
  /** Reshapes every surface after it is built, as the banana's bend does. */
  deform?(geo: BufferGeometry): void;
  /** The colour of its juice, for drops and stains. */
  juice: string;
}

export interface FruitModels {
  whole: Group;
  /**
   * The two halves in the same frame as the whole. Half a faces away
   * along +y and half b along -y, each with its cut face toward the
   * other, so a slice can turn both at once to line up with the blade.
   */
  halves: [Group, Group];
}

function mesh(geo: BufferGeometry, material: Material, deform?: (geo: BufferGeometry) => void): Mesh {
  if (deform) {
    deform(geo);
    weldNormals(geo);
  }
  const m = new Mesh(geo, material);
  m.castShadow = true;
  return m;
}

/** Wraps parts built around the y axis so that, for an along cut, the cut plane ends up across y. */
function frame(parts: Object3D[], cut: FruitSpec["cut"]): Group {
  const inner = new Group();
  inner.add(...parts);
  if (cut === "along") inner.rotation.z = Math.PI / 2;
  const outer = new Group();
  outer.add(inner);
  return outer;
}

export function buildFruit(spec: FruitSpec): FruitModels {
  const skin = spec.skin();
  const flesh = spec.flesh();
  const parts = spec.attachments?.() ?? [];
  const extras = (half?: "a" | "b") => parts.filter((p) => !half || p.half === half).map((p) => p.object.clone());
  const { shape, deform } = spec;

  const whole = frame([mesh(revolve(shape), skin, deform), ...extras()], spec.cut);
  let a: Object3D[];
  let b: Object3D[];
  if (spec.cut === "across") {
    const t = middleT(shape);
    a = [mesh(revolve(shape, t, 1), skin, deform), mesh(acrossCap(shape, t, false), flesh, deform)];
    b = [mesh(revolve(shape, 0, t), skin, deform), mesh(acrossCap(shape, t, true), flesh, deform)];
  } else {
    a = [mesh(revolve(shape, 0, 1, 0, Math.PI), skin, deform), mesh(alongCap(shape, -1), flesh, deform)];
    b = [mesh(revolve(shape, 0, 1, Math.PI, Math.PI * 2), skin, deform), mesh(alongCap(shape, 1), flesh, deform)];
  }
  return { whole, halves: [frame([...a, ...extras("a")], spec.cut), frame([...b, ...extras("b")], spec.cut)] };
}
