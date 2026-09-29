"use client";
import dynamic from "next/dynamic";

/**
 * The host app talks to sockets, audio and canvas from its first render,
 * none of which exist on the server, so it only ever renders in the browser.
 * The site home first checks for a phone, which gets the join screen instead.
 */
export const HostEntry = dynamic(() => import("./SiteHome").then((mod) => mod.SiteHome), { ssr: false });
