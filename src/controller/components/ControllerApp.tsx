"use client";
import { useEffect, useState } from "react";
import { Brand } from "@/components/ui/Brand";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ControllerSession } from "../controller-session";
import { useControllerStore } from "../controller-store";
import { EnableScreen } from "./EnableScreen";
import { ErrorScreen } from "./ErrorScreen";
import { LobbySteps } from "./LobbySteps";
import { MatchPad } from "./MatchPad";
import { ControllerContext } from "./session-context";

/** The phone's page: join, pick, calibrate, then fence. */
export function ControllerApp({ code }: { code: string }) {
  // Browser only (see ControllerEntry), so the session can be made up front.
  const [session] = useState(() => new ControllerSession(code));
  const { stage, error, slot, game, status, hostAway } = useControllerStore();

  useEffect(() => () => session.dispose(), [session]);

  const inMatch = game && game.phase !== "lobby";
  const offline = stage === "playing" && (status !== "open" || hostAway);

  return (
    <ControllerContext.Provider value={session}>
      <div className="phone">
        <header className="phone__bar">
          <Brand />
          <div className="phone__bar-actions">
            {slot && <span className={`pill ${slot === 1 ? "pill--accent" : ""}`}>Player {slot}</span>}
            <ThemeToggle />
            <GitHubButton compact />
          </div>
        </header>
        {offline && <p className="phone__notice">{hostAway ? "The host is reconnecting." : "Reconnecting to the game."}</p>}
        <main className="phone__body">
          {stage === "enable" && <EnableScreen code={code} />}
          {stage === "joining" && <p className="muted phone__waiting">Joining room {code}</p>}
          {stage === "error" && error && <ErrorScreen error={error} />}
          {stage === "playing" && slot && (inMatch ? <MatchPad slot={slot} game={game} /> : <LobbySteps slot={slot} />)}
        </main>
      </div>
    </ControllerContext.Provider>
  );
}
