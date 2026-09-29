"use client";
import dynamic from "next/dynamic";

/** Browser only, like the host: sensors, sockets and audio do not exist on the server. */
export const PhoneEntry = dynamic(() => import("./PhoneApp").then((mod) => mod.PhoneApp), { ssr: false });

/** The join screen reads the camera and storage, so it is browser only too. */
export const JoinEntry = dynamic(() => import("./JoinHome").then((mod) => mod.JoinHome), { ssr: false });
