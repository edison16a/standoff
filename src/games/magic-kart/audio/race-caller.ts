import type { AudioEngine } from "@/platform/audio/audio-engine";
import { CHARACTERS } from "../characters";
import type { RaceEvent } from "../engine/events";
import type { RaceWorld } from "../engine/world";
import { Announcer } from "./announcer";
import { applause, cheer } from "./crowd";

const PLACES = ["", "first", "second", "third", "fourth"];
const HIT_LINES = ["Direct hit!", "Ooh, that one stung!", "Spun right out!", "Right on target!"];
const AIR_LINES = ["Big air!", "Wings out!", "Look at them fly!", "Flying!"];

/**
 * The grandstands and the race caller: the crowd roars at the start and
 * at every finish, and the announcer calls the big moments. Only the
 * players' own karts get called, and lines are rationed, so the caller
 * stays a treat instead of a chatterbox.
 */
export class RaceCaller {
  private readonly announcer: Announcer;
  private winnerCalled = false;

  constructor(private readonly engine: AudioEngine) {
    this.announcer = new Announcer(engine);
  }

  private get crowd(): AudioNode {
    return this.engine.bus("crowd");
  }

  /** A new race. The countdown's beeps carry the start, so the caller keeps quiet until the pack is moving. */
  countdown(): void {
    this.winnerCalled = false;
    this.announcer.stop();
  }

  event(event: RaceEvent, world: RaceWorld): void {
    const kart = "kart" in event ? world.karts[event.kart] : undefined;
    const player = kart !== undefined && kart.seat !== null;
    switch (event.type) {
      case "go":
        cheer(this.engine, this.crowd, this.engine.now, { size: 0.8, length: 2.2 });
        this.announcer.say("And they're off!", true);
        return;
      case "finalLap":
        if (player) this.announcer.say("Final lap!", true);
        return;
      case "hit":
        if (player && event.by === "orb" && event.from !== null && Math.random() < 0.5) this.announcer.sayOne(HIT_LINES);
        return;
      case "glide":
        // Every big jump opens the glider, so only some of them get a call.
        if (player && event.open && Math.random() < 0.4) this.announcer.sayOne(AIR_LINES);
        return;
      case "finish": {
        if (!kart) return;
        const name = CHARACTERS[kart.character].name;
        if (event.place === 1 && !this.winnerCalled) {
          this.winnerCalled = true;
          this.announcer.say(`${name} takes the checkered flag!`, true);
          cheer(this.engine, this.crowd, this.engine.now, { size: 1, length: 3.2 });
          applause(this.engine, this.crowd, this.engine.now + 0.3, 4);
        } else if (player) {
          this.announcer.say(`${name} finishes ${PLACES[event.place] ?? ""}!`);
          cheer(this.engine, this.crowd, this.engine.now, { size: 0.5, length: 1.8 });
        }
        return;
      }
      default:
        return;
    }
  }

  /** The podium: a long round of applause under the fanfare. */
  results(): void {
    applause(this.engine, this.crowd, this.engine.now + 0.5, 5, 0.8);
  }

  stop(): void {
    this.announcer.stop();
  }
}
