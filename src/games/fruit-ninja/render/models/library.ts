import { Color, Mesh, MeshStandardMaterial, type Group, type Object3D } from "three";
import { FRUIT_IDS, KINDS, type BodyKind, type FruitId } from "../../engine/fruit-kinds";
import { crackTexture } from "../textures/sprites";
import { buildBomb } from "./bomb";
import { revolve } from "./revolve";
import { buildFruit, type FruitSpec } from "./spec";
import { coconut, greenApple, kiwi, lemon, lime, orange, peach, plum, redApple, watermelon } from "./specs-common";
import { banana, dragonfruit, giantMelon, pineapple, pomegranate, starFruit, strawberry } from "./specs-special";

const SPECS: Record<FruitId, FruitSpec> = {
  watermelon,
  orange,
  apple: redApple,
  "green-apple": greenApple,
  banana,
  pineapple,
  kiwi,
  coconut,
  strawberry,
  lemon,
  lime,
  plum,
  peach,
  "giant-melon": giantMelon,
  pomegranate,
  "star-fruit": starFruit,
  dragonfruit,
};

export interface Template {
  whole: Group;
  /** Missing for the bomb, which explodes instead of splitting. */
  halves: [Group, Group] | null;
  /** Model units to world units, so the model matches the hit radius. */
  scale: number;
  juice: Color;
}

/**
 * Builds each fruit's models the first time they are needed and keeps
 * them, so every fruit on screen shares its geometry and materials with
 * every other of its kind. `warm` builds one kind per call, so the lobby
 * can prepare them a frame at a time without a hitch.
 */
export class ModelLibrary {
  private readonly templates = new Map<BodyKind, Template>();
  private readonly pending: BodyKind[] = [...FRUIT_IDS, "bomb"];

  get(kind: BodyKind): Template {
    let template = this.templates.get(kind);
    if (!template) {
      template = kind === "bomb" ? bombTemplate() : fruitTemplate(kind, SPECS[kind]);
      this.templates.set(kind, template);
    }
    return template;
  }

  /** Builds one more kind ahead of time. Returns false once all are built. */
  warm(): boolean {
    const next = this.pending.shift();
    if (!next) return false;
    this.get(next);
    return this.pending.length > 0;
  }

  /** A fresh copy of the whole fruit, sharing geometry and materials. */
  whole(kind: BodyKind): Object3D {
    return this.get(kind).whole.clone();
  }

  half(kind: BodyKind, which: 0 | 1): Object3D | null {
    return this.get(kind).halves?.[which].clone() ?? null;
  }
}

let shared: ModelLibrary | null = null;

/**
 * One library for the whole page, so a second room reuses the models and
 * painted textures of the first instead of painting them again.
 */
export function sharedLibrary(): ModelLibrary {
  shared ??= new ModelLibrary();
  return shared;
}

function fruitTemplate(kind: FruitId, spec: FruitSpec): Template {
  const models = buildFruit(spec);
  if (KINDS[kind].class === "big") addCracks(models.whole, spec);
  return { whole: models.whole, halves: models.halves, scale: KINDS[kind].radius / spec.fit, juice: new Color(spec.juice) };
}

/**
 * A thin shell just outside a big fruit's peel, painted with cracks. Its
 * opacity rises with every hit, so the fruit visibly gives way.
 */
function addCracks(whole: Group, spec: FruitSpec): void {
  const material = new MeshStandardMaterial({ map: crackTexture(), transparent: true, opacity: 0, depthWrite: false, roughness: 0.6 });
  const shell = new Mesh(revolve(spec.shape), material);
  shell.scale.setScalar(1.012);
  shell.name = "crack";
  whole.children[0]!.add(shell);
}

function bombTemplate(): Template {
  return { whole: buildBomb(), halves: null, scale: KINDS.bomb.radius / 1.05, juice: new Color("#333333") };
}
