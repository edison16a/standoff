"use client";
import dynamic from "next/dynamic";

/** Browser only for the same reason as the host: sensors, sockets and audio. */
export const ControllerEntry = dynamic(() => import("./ControllerApp").then((mod) => mod.ControllerApp), { ssr: false });
