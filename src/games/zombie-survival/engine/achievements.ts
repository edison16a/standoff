import type { Seat } from "@/platform/protocol";
import type { GameEvent } from "./events";
import type { PlayerStats } from "./stats";

interface Award {
  id: string;
  title: string;
  text: string;
}

/** Awards a player earns alone. Each can be earned once per player per run. */
const PERSONAL = {
  firstKill: { id: "first-kill", title: "Opening Shot", text: "First zombie down" },
  headhunter: { id: "headhunter", title: "Headhunter", text: "10 head shots" },
  sharpshooter: { id: "sharpshooter", title: "Sharpshooter", text: "10 hits in a row" },
  weakSpot: { id: "weak-spot", title: "Weak Spot", text: "Broke a boss weak point" },
  giantSlayer: { id: "giant-slayer", title: "Giant Slayer", text: "Landed the final blow on a boss" },
  exterminator: { id: "exterminator", title: "Exterminator", text: "50 zombies down" },
  centurion: { id: "centurion", title: "Centurion", text: "100 zombies down" },
  twoForOne: { id: "two-for-one", title: "Two for One", text: "Two zombies with one shot" },
} satisfies Record<string, Award>;

/** Awards the whole team earns together. Each once per run. */
const TEAM = {
  untouchable: { id: "untouchable", title: "Untouchable", text: "Cleared a stage without a scratch" },
  closeCall: { id: "close-call", title: "Close Call", text: "Cleared a stage on almost no health" },
  halfway: { id: "halfway", title: "Halfway There", text: "Reached stage 13" },
  changeOfPlans: { id: "change-of-plans", title: "Change of Plans", text: "Survived the chopper crash" },
  teamwork: { id: "teamwork", title: "Teamwork", text: "Everyone broke a weak point on the same boss" },
  survivor: { id: "survivor", title: "Survivors", text: "Escaped the city" },
} satisfies Record<string, Award>;

export type TeamAward = keyof typeof TEAM;

/**
 * Watches the game and hands out achievements the moment they are earned.
 * It reads the same events everyone else does, plus each player's stats.
 */
export class Achievements {
  private readonly earned = new Set<string>();
  /** Seats that broke a weak point on each boss, by zombie id. */
  private readonly breakers = new Map<number, Set<Seat>>();
  /** Kills by the shot being resolved now, to spot two with one pellet spread. */
  private shotKills = { key: "", count: 0 };

  constructor(private readonly emit: (event: GameEvent) => void) {}

  reset(): void {
    this.earned.clear();
    this.breakers.clear();
    this.shotKills = { key: "", count: 0 };
  }

  /** Called for each event with the stats of the seat involved. */
  observe(event: GameEvent, stats: (seat: Seat) => PlayerStats | undefined, teamSize: number, shotId: number): void {
    if (event.type === "kill") {
      const s = stats(event.seat);
      if (!s) return;
      this.personal(event.seat, "firstKill", s.kills >= 1);
      this.personal(event.seat, "headhunter", s.headshots >= 10);
      this.personal(event.seat, "exterminator", s.kills >= 50);
      this.personal(event.seat, "centurion", s.kills >= 100);
      this.personal(event.seat, "giantSlayer", event.kind === "butcher" || event.kind === "tank" || event.kind === "juggernaut" || event.kind === "behemoth");
      const key = `${event.seat}:${shotId}`;
      // A shot's kills arrive together, so only the latest shot needs counting.
      this.shotKills = this.shotKills.key === key ? { key, count: this.shotKills.count + 1 } : { key, count: 1 };
      this.personal(event.seat, "twoForOne", this.shotKills.count >= 2);
    }
    if (event.type === "hit") {
      const s = stats(event.seat);
      if (s) this.personal(event.seat, "sharpshooter", s.streak >= 10);
    }
    if (event.type === "weak-broken") {
      this.personal(event.seat, "weakSpot", true);
      const who = this.breakers.get(event.zombie) ?? new Set<Seat>();
      who.add(event.seat);
      this.breakers.set(event.zombie, who);
      if (teamSize >= 2 && who.size >= teamSize) this.team("teamwork");
    }
  }

  team(key: TeamAward): void {
    const award = TEAM[key];
    if (this.earned.has(award.id)) return;
    this.earned.add(award.id);
    this.emit({ type: "achievement", id: award.id, seat: null, title: award.title, text: award.text });
  }

  private personal(seat: Seat, key: keyof typeof PERSONAL, earned: boolean): void {
    const award = PERSONAL[key];
    const id = `${award.id}:${seat}`;
    if (!earned || this.earned.has(id)) return;
    this.earned.add(id);
    this.emit({ type: "achievement", id: award.id, seat, title: award.title, text: award.text });
  }
}
