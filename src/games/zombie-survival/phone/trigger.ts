/**
 * The phone side of the trigger. A tap fires once. Holding it with an
 * automatic weapon keeps firing at the weapon's rate until the finger
 * lifts. The host still checks the rate and the ammo, so this only
 * decides when to ask.
 */
export class TriggerHold {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly fire: () => void) {}

  get held(): boolean {
    return this.timer !== null;
  }

  press(auto: boolean, rate: number): void {
    this.release();
    this.fire();
    if (auto && rate > 0) this.timer = setInterval(() => this.fire(), 1000 / rate);
  }

  release(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
