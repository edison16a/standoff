import type { HostRoomApi } from "@/platform/games/game-api";
import type { FightDriver } from "./fight-driver";
import { useBoxingStore as store } from "./host-store";
import { KEY_POWER, KeyBoxer, type BoxKey, type KeyPunch } from "./key-boxer";
import { KeyControls } from "./key-controls";
import { listenKeyboardSeat } from "./key-messages";

export interface KeyPlayHooks {
  /** The fight driver while a fight is on, for punches. */
  driver(): FightDriver | null;
  /** A key down on the build choice: browse or lock in. */
  pick(key: BoxKey): void;
}

/**
 * Keyboard mode: player 1 boxes with the keys against the computer, with
 * no camera. Keys come from this page or from the admin panel's Keyboard
 * player, whose hello in the menu switches keyboard mode on. The boxer's
 * head and gloves go to the fight every frame, and punches go the moment
 * their key goes down.
 */
export class KeyPlay {
  readonly boxer = new KeyBoxer();
  private readonly controls: KeyControls;
  private readonly stopSeat: () => void;

  constructor(
    room: HostRoomApi,
    private readonly hooks: KeyPlayHooks,
  ) {
    this.controls = new KeyControls(
      () => store.getState().input === "keys",
      (key, down) => this.onKey(key, down),
      () => this.boxer.release(),
    );
    this.stopSeat = listenKeyboardSeat(room, {
      hello: () => store.getState().screen === "players" && store.setState({ input: "keys", players: 1 }),
      key: (key, down) => this.controls.remote(key, down),
    });
  }

  get on(): boolean {
    return store.getState().input === "keys";
  }

  /** A new fight starts standing tall with nothing held. */
  reset(): void {
    this.boxer.reset();
  }

  /** Every frame of a fight: player 1's head and gloves from the keys. */
  defend(driver: FightDriver, now: number): void {
    driver.defend(1, this.boxer.defense(now));
  }

  dispose(): void {
    this.controls.dispose();
    this.stopSeat();
  }

  private onKey(key: BoxKey, down: boolean): void {
    const punch = this.boxer.press(key, down);
    if (!down) return;
    const screen = store.getState().screen;
    if (screen === "pick") this.hooks.pick(key);
    if (screen === "fight" && punch) this.throw(punch);
  }

  private throw({ hand, straight, level }: KeyPunch): void {
    this.hooks.driver()?.punch(1, hand, straight, KEY_POWER, level);
  }
}
