import * as THREE from "three";
import { FaceTexture } from "./face-texture";
import type { Look } from "./looks";
import { gloveTexture, trunksTexture, waistbandTexture } from "./kit-textures";
import { skinDetail } from "./skin-detail";

/**
 * Every surface of one boxer. Skin is a physical material with a soft
 * sheen for the light passing through it and a clear coat for sweat,
 * which builds up as the fight goes on. Trunks are satin and the gloves
 * are glossy leather, so both catch the ring lights.
 */
export class BoxerMaterials {
  readonly face: FaceTexture;
  readonly skin: THREE.MeshPhysicalMaterial;
  readonly head: THREE.MeshPhysicalMaterial;
  readonly hair: THREE.MeshStandardMaterial;
  readonly trunks: THREE.MeshPhysicalMaterial;
  readonly waistband: THREE.MeshPhysicalMaterial;
  readonly gloves: THREE.MeshPhysicalMaterial;
  readonly laces: THREE.MeshStandardMaterial;
  readonly shoes: THREE.MeshPhysicalMaterial;
  readonly socks: THREE.MeshStandardMaterial;
  readonly sole: THREE.MeshStandardMaterial;
  readonly eyeWhite: THREE.MeshStandardMaterial;
  readonly iris: THREE.MeshStandardMaterial;
  private readonly textures: THREE.Texture[] = [];

  constructor(readonly look: Look) {
    this.face = new FaceTexture(look);
    const skin = {
      roughness: 0.52,
      metalness: 0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.35,
      sheen: 0.25,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color("#ff9a80"),
    };
    // Fine grain on the skin breaks up the highlights under the ring lights.
    const grain = skinDetail();
    this.textures.push(grain);
    const detail = { normalMap: grain, normalScale: new THREE.Vector2(0.35, 0.35) };
    this.skin = new THREE.MeshPhysicalMaterial({ ...skin, ...detail, color: look.skin });
    this.head = new THREE.MeshPhysicalMaterial({ ...skin, ...detail, color: "#ffffff", map: this.face.texture });
    this.hair = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.85 });
    const trunks = trunksTexture(look);
    const band = waistbandTexture(look);
    const glove = gloveTexture(look);
    this.textures.push(trunks, band, glove);
    const satin = { roughness: 0.32, sheen: 1, sheenRoughness: 0.28, clearcoat: 0.35, clearcoatRoughness: 0.2 };
    this.trunks = new THREE.MeshPhysicalMaterial({ ...satin, map: trunks, sheenColor: new THREE.Color(look.trunks).lerp(new THREE.Color("#ffffff"), 0.5) });
    this.waistband = new THREE.MeshPhysicalMaterial({ ...satin, map: band, sheenColor: new THREE.Color("#ffffff") });
    this.gloves = new THREE.MeshPhysicalMaterial({ map: glove, roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.12 });
    this.laces = new THREE.MeshStandardMaterial({ color: look.gloveTrim, roughness: 0.6 });
    this.shoes = new THREE.MeshPhysicalMaterial({ color: look.shoes, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    this.socks = new THREE.MeshStandardMaterial({ color: look.socks, roughness: 0.9 });
    this.sole = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.8 });
    this.eyeWhite = new THREE.MeshStandardMaterial({ color: "#f2ece4", roughness: 0.2 });
    this.iris = new THREE.MeshStandardMaterial({ color: look.eyes, roughness: 0.1 });
  }

  /** 0 dry to 1 dripping: the skin gets glossier through the rounds and after big exchanges. */
  setSweat(amount: number): void {
    const wet = Math.max(0, Math.min(1, amount));
    for (const m of [this.skin, this.head]) {
      m.clearcoat = 0.12 + 0.55 * wet;
      m.clearcoatRoughness = 0.35 - 0.2 * wet;
      m.roughness = 0.52 - 0.14 * wet;
    }
  }

  /** Lights the gloves while a computer boxer winds up, so the punch can be read. 0 is off. */
  setGlint(amount: number): void {
    this.gloves.emissive.setRGB(amount * 1.0, amount * 0.85, amount * 0.5);
  }

  dispose(): void {
    this.face.dispose();
    for (const texture of this.textures) texture.dispose();
    for (const m of [this.skin, this.head, this.hair, this.trunks, this.waistband, this.gloves, this.laces, this.shoes, this.socks, this.sole, this.eyeWhite, this.iris]) m.dispose();
  }
}
