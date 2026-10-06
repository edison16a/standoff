"use client";
import { PanelApp } from "./PanelApp";

/** Only a host page's phone panel may seat the keyboard player, never this address opened by itself. */
export function PanelFrame({ code }: { code: string }) {
  if (window.parent === window) {
    return (
      <main className="phone">
        <p className="phone__notice">The keyboard player opens from the admin panel on the big screen.</p>
      </main>
    );
  }
  return <PanelApp code={code} />;
}
