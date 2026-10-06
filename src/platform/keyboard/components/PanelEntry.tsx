"use client";
import dynamic from "next/dynamic";

/** Browser only, like the phone page: sockets and audio do not exist on the server. */
export const PanelEntry = dynamic(() => import("./PanelFrame").then((mod) => mod.PanelFrame), { ssr: false });
