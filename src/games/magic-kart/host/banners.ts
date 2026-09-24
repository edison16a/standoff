import type { RaceEvent } from "../engine/events";
import { ITEM_NAMES } from "../engine/items";
import type { RaceWorld } from "../engine/world";
import { ordinal } from "../ui/format";


/**
 * Short messages across a player's view, each shown for a moment: final
 * lap, spun out, blocked. A finish stays up for good.
 */
export class Banners {
  private readonly shown = new Map<number, { text: string; until: number }>();

  clear(): void {
    this.shown.clear();
  }

  text(kartId: number, time: number): string | null {
    const banner = this.shown.get(kartId);
    return banner && time < banner.until ? banner.text : null;
  }

  onEvent(event: RaceEvent, world: RaceWorld): void {
    const t = world.time;
    const show = (kart: number, text: string, seconds: number) => {
      // A finish banner is never pushed off by something smaller.
      if (world.karts[kart]?.race.finished && event.type !== "finish") return;
      this.shown.set(kart, { text, until: t + seconds });
    };
    switch (event.type) {
      case "finalLap":
        return show(event.kart, "Final lap", 2.5);
      case "finish":
        return show(event.kart, `${ordinal(event.place)} place`, Infinity);
      case "hit":
        return show(event.kart, event.by === "ice" ? "Iced up" : "Spun out", 1.4);
      case "blocked":
        return show(event.kart, "Blocked", 1.2);
      case "fell":
        return show(event.kart, "Whoops", 1.4);
      case "use":
        if (event.item === "ghost") show(event.kart, ITEM_NAMES.ghost, 1.2);
        return;
      default:
        return;
    }
  }
}
