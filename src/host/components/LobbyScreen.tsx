"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { TopBar } from "@/components/ui/TopBar";
import { useHostStore } from "../host-store";
import { HowToPlay } from "./HowToPlay";
import { JoinQr } from "./JoinQr";
import { PlayerSlot } from "./PlayerSlot";
import { useSession } from "./session-context";
import { TuningPanel } from "./TuningPanel";

type LobbyTab = "players" | "howto" | "tuning";

const TABS: { id: LobbyTab; label: string }[] = [
  { id: "players", label: "Players" },
  { id: "howto", label: "How to play" },
  { id: "tuning", label: "Tuning" },
];

/** The waiting room: a QR code on the left, players and settings on the right. */
export function LobbyScreen() {
  const session = useSession();
  const room = useHostStore((state) => state.room);
  const seats = useHostStore((state) => state.seats);
  const status = useHostStore((state) => state.status);
  const [tab, setTab] = useState<LobbyTab>("players");

  const joined = Number(seats[1].connected) + Number(seats[2].connected);
  const hint =
    joined < 2
      ? `Scan the code with ${joined === 0 ? "two phones" : "one more phone"} on the same WiFi.`
      : "Both players are in. The match starts when both tap Ready.";

  return (
    <div className="host-page">
      <TopBar>
        {status !== "open" && <span className="pill">Reconnecting</span>}
        <button type="button" className="btn btn--ghost" onClick={() => session.endGame()}>
          <Icon name="leave" />
          End game
        </button>
      </TopBar>
      <main className="lobby">
        <section className="lobby__join card">
          {room && <JoinQr url={room.joinUrl} code={room.code} />}
          <p className="muted lobby__hint">
            <Icon name="wifi" size={16} />
            {hint}
          </p>
        </section>
        <section className="lobby__side">
          <Tabs items={TABS} value={tab} onChange={setTab} label="Lobby sections" />
          <div className="lobby__panel">
            {tab === "players" && (
              <div className="lobby__slots">
                <PlayerSlot slot={1} seat={seats[1]} />
                <PlayerSlot slot={2} seat={seats[2]} />
              </div>
            )}
            {tab === "howto" && <HowToPlay />}
            {tab === "tuning" && <TuningPanel />}
          </div>
        </section>
      </main>
    </div>
  );
}
