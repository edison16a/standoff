"use client";
import { useState } from "react";
import { StandoffMark } from "@/components/ui/Brand";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useHostStore } from "../host-store";
import { useSession } from "./session-context";
import { StripPreview } from "./StripPreview";

/** The first screen: the strip, the name, and one button. */
export function Landing() {
  const session = useSession();
  const error = useHostStore((state) => state.error);
  const status = useHostStore((state) => state.status);
  const [creating, setCreating] = useState(false);
  const ready = status === "open";

  const create = async () => {
    setCreating(true);
    await session.createGame();
    setCreating(false);
  };

  return (
    <div className="landing">
      <StripPreview />
      <div className="landing__tools">
        <ThemeToggle />
        <GitHubButton />
      </div>
      <main className="landing__center">
        <span className="landing__mark">
          <StandoffMark />
        </span>
        <h1 className="landing__title">Standoff</h1>
        <button type="button" className="btn btn--primary btn--lg" onClick={create} disabled={creating || !ready}>
          <Icon name="plus" />
          {ready ? "Create game" : "Connecting"}
        </button>
        {status === "unreachable" && <p className="landing__note">Can&apos;t reach the game server.</p>}
        {error && <p className="landing__note">{error}</p>}
      </main>
    </div>
  );
}
