"use client";
import dynamic from "next/dynamic";

/** Browser only, like the host: sensors, sockets and audio do not exist on the server. */
export const PhoneEntry = dynamic(() => import("./PhoneApp").then((mod) => mod.PhoneApp), { ssr: false });
