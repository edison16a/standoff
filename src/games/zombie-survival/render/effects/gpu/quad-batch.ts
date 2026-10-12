import * as THREE from "three";

/** The per quad numbers a batch carries, by attribute name and size. */
export type QuadLayout = Record<string, 1 | 2 | 3 | 4>;

/**
 * Many small quads drawn in one call. Effects come and go every frame,
 * so instead of a mesh per spark or puff the owner rewrites the live
 * quads into flat arrays each frame and the GPU expands them. Nothing is
 * allocated after construction, which keeps a firefight free of garbage.
 */
export class QuadBatch {
  readonly mesh: THREE.Mesh;
  /** Each attribute's backing array, `size` numbers per quad. Write quad `i` at `i * size`. */
  readonly data: Record<string, Float32Array> = {};
  private readonly geometry = new THREE.InstancedBufferGeometry();
  private readonly attributes: THREE.InstancedBufferAttribute[] = [];
  private count = 0;

  /** `base` is the single quad every instance copies: its corners and uv. */
  constructor(
    readonly capacity: number,
    layout: QuadLayout,
    material: THREE.Material,
    base: THREE.BufferGeometry,
  ) {
    this.geometry.index = base.index;
    this.geometry.setAttribute("position", base.getAttribute("position"));
    if (base.getAttribute("uv")) this.geometry.setAttribute("uv", base.getAttribute("uv"));
    for (const [name, size] of Object.entries(layout)) {
      const array = new Float32Array(capacity * size);
      const attribute = new THREE.InstancedBufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage);
      this.data[name] = array;
      this.attributes.push(attribute);
      this.geometry.setAttribute(name, attribute);
    }
    this.geometry.instanceCount = 0;
    this.mesh = new THREE.Mesh(this.geometry, material);
    // The quads are placed in the shader, so the mesh's own bounds mean nothing.
    this.mesh.frustumCulled = false;
  }

  /** Starts a frame's rewrite: every quad from the last frame is dropped. */
  begin(): void {
    this.count = 0;
  }

  /** The index of the next quad to fill this frame, or -1 when the batch is full. */
  take(): number {
    return this.count < this.capacity ? this.count++ : -1;
  }

  /** Sends this frame's quads to the GPU. Only the part in use is uploaded. */
  end(): void {
    this.geometry.instanceCount = this.count;
    // An empty batch still draws a zero instance call, so hide it instead.
    this.mesh.visible = this.count > 0;
    if (this.count === 0) return;
    for (const attribute of this.attributes) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, this.count * attribute.itemSize);
      attribute.needsUpdate = true;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** Writes up to four numbers into one quad's slot of an attribute array. */
export function put(array: Float32Array, size: number, i: number, a: number, b = 0, c = 0, d = 0): void {
  const k = i * size;
  array[k] = a;
  if (size > 1) array[k + 1] = b;
  if (size > 2) array[k + 2] = c;
  if (size > 3) array[k + 3] = d;
}
