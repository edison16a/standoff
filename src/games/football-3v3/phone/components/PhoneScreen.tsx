"use client";
import { useEffect, useState } from "react";
import { usePhoneStore } from "../phone-store";
import { Controller, ResultCard } from "./Controller";
import { Setup } from "./Setup";

function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return portrait;
}

/**
 * Football 3v3 on the phone: the setup steps, then the controller while
 * this phone has a player in the game, then the result. A phone that
 * joined mid game stays in setup until the next one.
 */
export function PhoneScreen() {
  const host = usePhoneStore((s) => s.host);
  const portrait = usePortrait();

  if (host?.playing && host.phase !== "lobby" && host.phase !== "over") {
    return (
      <div className="fb-phone fb-phone--pad">
        <Controller host={host} />
        {portrait && (
          <div className="fb-turn">
            <strong>Turn your phone sideways</strong>
            <span>Hold it like a controller: moving on the left, the ball and the buttons on the right.</span>
          </div>
        )}
      </div>
    );
  }

  if (host?.playing && host.phase === "over") {
    return (
      <div className="fb-phone">
        <ResultCard host={host} />
      </div>
    );
  }

  return (
    <div className="fb-phone">
      <Setup />
    </div>
  );
}
