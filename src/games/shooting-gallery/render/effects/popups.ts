import * as THREE from "three";

const LIFE_S = 1.15;
const RISE = 0.55;

interface Popup {
  sprite: THREE.Sprite;
  base: THREE.Vector3;
  start: number;
  width: number;
}

/**
 * The points a hit scores, floating up from the target in the shooter's
 * colour. A bullseye or golden duck gets a word on top. Each popup paints
 * its own small canvas, which is freed as soon as it fades.
 */
export class Popups {
  readonly object = new THREE.Group();
  private readonly active: Popup[] = [];

  show(at: THREE.Vector3, points: number, colour: string, label: string | null, now: number): void {
    const element = document.createElement("canvas");
    element.width = 512;
    element.height = 256;
    const ctx = element.getContext("2d");
    if (!ctx) return;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    const draw = (text: string, y: number, size: number, fill: string) => {
      ctx.font = `900 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.lineWidth = size * 0.2;
      ctx.strokeStyle = "rgba(20, 10, 16, 0.92)";
      ctx.strokeText(text, 256, y);
      ctx.fillStyle = fill;
      ctx.fillText(text, 256, y);
    };
    if (label) draw(label, 78, 64, "#fff3c4");
    draw(`+${points}`, label ? 200 : 170, 128, colour);
    const texture = new THREE.CanvasTexture(element);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    sprite.renderOrder = 6;
    // Bigger scores float a little larger.
    const width = 1.25 + Math.min(0.6, points / 80);
    sprite.scale.set(width, width / 2, 1);
    sprite.position.copy(at);
    this.object.add(sprite);
    this.active.push({ sprite, base: at.clone(), start: now, width });
  }

  update(now: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const popup = this.active[i]!;
      const t = (now - popup.start) / LIFE_S;
      if (t >= 1) {
        this.object.remove(popup.sprite);
        popup.sprite.material.map?.dispose();
        popup.sprite.material.dispose();
        this.active.splice(i, 1);
        continue;
      }
      // Pops in with an overshoot, floats up, then fades in its last third.
      const pop = t < 0.15 ? 0.4 + 0.85 * Math.sin((t / 0.15) * (Math.PI / 2)) : 1.25 - Math.min(0.25, (t - 0.15) * 1.5);
      const scale = popup.width * pop;
      popup.sprite.scale.set(scale, scale / 2, 1);
      // Floats toward the players a little, so it is never hidden by the wave in front.
      popup.sprite.position.copy(popup.base).add(new THREE.Vector3(0, RISE * (1 - (1 - t) * (1 - t)) + 0.25, 0.6));
      popup.sprite.material.opacity = t < 0.66 ? 1 : 1 - (t - 0.66) / 0.34;
    }
  }
}
