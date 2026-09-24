"use client";
import dynamic from "next/dynamic";

/**
 * The host app talks to sockets, audio and canvas from its first render,
 * none of which exist on the server, so it only ever renders in the browser.
 */
export const HostEntry = dynamic(() => import("./HostApp").then((mod) => mod.HostApp), { ssr: false });
