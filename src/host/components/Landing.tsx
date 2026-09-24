"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { TopBar } from "@/components/ui/TopBar";
import { useHostStore } from "../host-store";
import { useSession } from "./session-context";
import { StripPreview } from "./StripPreview";

const STEPS = [
  { icon: "plus", title: "Create a game", text: "This computer hosts the strip and referees every touch." },
  { icon: "phone", title: "Scan with two phones", text: "No app to install. The phones join over your WiFi." },
  { icon: "target", title: "Fence", text: "Thrust to jab, snap back to parry, push out to advance." },
] as const;

/** The first screen: what this is and one button to start. */
export function Landing() {
  const session = useSession();
  const error = useHostStore((state) => state.error);
  const status = useHostStore((state) => state.status);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    await session.createGame();
    setCreating(false);
  };

  return (
    <div className="host-page">
      <TopBar />
      <main className="landing">
        <section className="landing__intro">
          <p className="label">Phone controlled fencing</p>
          <h1 className="landing__title">Standoff</h1>
          <p className="landing__lead muted">
            Two phones become two swords. Your computer shows the strip, calls every touch and replays each point.
            First to two touches wins.
          </p>
          <button type="button" className="btn btn--primary btn--lg" onClick={create} disabled={creating || status !== "open"}>
            <Icon name="plus" />
            {status === "open" ? "Create game" : "Connecting"}
          </button>
          {error && <p className="landing__error">{error}</p>}
          <ol className="landing__steps">
            {STEPS.map((step) => (
              <li key={step.title}>
                <span className="landing__step-icon">
                  <Icon name={step.icon} />
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <p className="muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="landing__art card">
          <StripPreview />
        </section>
      </main>
    </div>
  );
}
