import * as THREE from "three";
import type { CharacterId } from "../characters";
import { flameGeometry, flameMaterial, type FlameStyle } from "./effects/flame";
import { kartShadow } from "./kart-shadow";
import { flat, starShape } from "./models/geo";
import { kartDesign } from "./models/karts";
import { softDot } from "./textures";

/**
 * Pieces every kart can show on top of its model, built once and shared:
 * each kart's contact shadow, the shield bubble, the stars of a spin out,
 * the ice on the wheels and the boost flames.
 */
export class KartExtras {
  readonly shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly shadows = new Map<CharacterId, THREE.MeshBasicMaterial>();
  readonly shieldGeo = new THREE.IcosahedronGeometry(2, 3);
  readonly shieldMat = fresnelMaterial("#5fffd0");
  readonly starGeo = flat(starShape(0.22, 0.1), 0.06).center();
  readonly starMat = new THREE.MeshBasicMaterial({ color: "#ffe14d", toneMapped: false });
  readonly iceGeo = new THREE.OctahedronGeometry(0.45, 0);
  readonly iceMat = new THREE.MeshStandardMaterial({ color: "#bff3ff", transparent: true, opacity: 0.75, roughness: 0.1, emissive: "#5fd8ff", emissiveIntensity: 0.4 });
  readonly flameGeo = flameGeometry();
  readonly flames: Record<FlameStyle, { outer: THREE.ShaderMaterial; core: THREE.ShaderMaterial }> = {
    fire: { outer: flameMaterial("fire"), core: flameMaterial("fire", true) },
    plasma: { outer: flameMaterial("plasma"), core: flameMaterial("plasma", true) },
  };

  /** The contact shadow drawn for this kart, made the first time it is asked for. */
  shadowFor(id: CharacterId): THREE.MeshBasicMaterial {
    let material = this.shadows.get(id);
    if (!material) {
      const map = kartShadow(kartDesign(id)) ?? softDot("rgba(0,0,0,0.6)", "rgba(0,0,0,0)");
      material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
      this.shadows.set(id, material);
    }
    return material;
  }

  /** Moves the flames' flicker on. Once a frame. */
  tick(time: number): void {
    for (const style of Object.values(this.flames)) {
      style.outer.uniforms.time!.value = time;
      style.core.uniforms.time!.value = time;
    }
  }

  dispose(): void {
    for (const item of [this.shadowGeo, this.shieldGeo, this.shieldMat, this.starGeo, this.starMat, this.iceGeo, this.iceMat, this.flameGeo]) item.dispose();
    for (const style of Object.values(this.flames)) for (const m of [style.outer, style.core]) m.dispose();
    for (const m of this.shadows.values()) {
      m.map?.dispose();
      m.dispose();
    }
  }
}

/** A see through bubble that glows at its rim, like a soap film. */
export function fresnelMaterial(hex: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(hex) }, time: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(1.0 - abs(dot(vNormal, vView)), 2.2);
        float shimmer = 0.85 + 0.15 * sin(time * 6.0 + vNormal.y * 8.0);
        gl_FragColor = vec4(color * (0.15 + rim * 1.4) * shimmer, 0.2 + rim * 0.8);
        #include <colorspace_fragment>
      }`,
  });
}

/** A name tag sprite floating over a kart, in the kart's colour. */
export function nameTag(name: string, hex: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "bold 34px system-ui, sans-serif";
    const text = name.length > 12 ? `${name.slice(0, 11)}.` : name;
    const width = Math.min(248, ctx.measureText(text).width + 40);
    const x = (256 - width) / 2;
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.roundRect(x, 8, width, 44, 22);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 31);
    ctx.beginPath();
    ctx.moveTo(116, 52);
    ctx.lineTo(128, 63);
    ctx.lineTo(140, 52);
    ctx.fillStyle = hex;
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(2.6, 0.65, 1);
  sprite.renderOrder = 10;
  return sprite;
}
