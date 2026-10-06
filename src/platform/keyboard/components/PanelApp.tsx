"use client";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { Brand } from "@/components/ui/Brand";
import { Loader } from "@/components/ui/Loader";
import type { PhoneGame } from "@/platform/games/game-api";
import { loadWithRetry } from "@/platform/games/load-with-retry";
import { post, receive, type PageMessage } from "../bridge";
import { usePanelKeys } from "./use-panel-keys";
import { VirtualPhone, type VirtualStage } from "../virtual-phone";

const WAIT: Record<Exclude<VirtualStage, "playing">, string> = {
  joining: "Taking a seat",
  full: "Every seat is taken",
  closed: "The room has closed",
  failed: "Could not take a seat",
};

/**
 * The keyboard player's phone, inside the host page's phone panel. It is
 * its own page so the game's phone screen gets a phone sized window. It
 * joins the room as a phone, shows the game's phone screen for the mouse,
 * and passes keys and what the host says up to the page, where the
 * keyboard binding runs.
 */
export function PanelApp({ code }: { code: string }) {
  const parent = window.parent;
  const [phone] = useState(() => new VirtualPhone(code, { onHost: (payload) => post(parent, { type: "host", payload }) }));
  const state = useStore(phone.store);
  const [game, setGame] = useState<PhoneGame | null>(null);

  useEffect(() => {
    phone.start();
    const onMessage = (event: MessageEvent) => {
      const message = receive<PageMessage>(event, parent);
      if (message?.type === "send") phone.send(message.payload, message.lossy);
      if (message?.type === "replace") phone.replace(message.kinds);
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      phone.dispose();
    };
  }, [phone, parent]);

  useEffect(() => post(parent, { type: "status", state }), [parent, state]);
  usePanelKeys(parent);

  const gameId = state.game;
  useEffect(() => {
    const api = phone.api;
    if (!api || !gameId) return;
    let made: PhoneGame | null = null;
    let alive = true;
    void loadWithRetry(gameId).then((mod) => {
      if (!alive) return;
      made = mod.createPhone(api);
      setGame(made);
    });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [phone, gameId]);

  return (
    <div className="phone">
      <header className="phone__bar">
        <Brand />
        {state.seat && <span className={`pill ${state.seat === 1 ? "pill--accent" : ""}`}>{state.name}</span>}
      </header>
      <main className="phone__body">
        {state.stage !== "playing" ? <Loader label={WAIT[state.stage]} /> : game ? <game.Screen /> : <Loader label="Loading the game" />}
      </main>
    </div>
  );
}
