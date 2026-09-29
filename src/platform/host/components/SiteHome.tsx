"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Loader } from "@/components/ui/Loader";
import { phoneHome } from "@/platform/phone/device";

const loading = () => <Loader label="Loading" className="loader--page" />;
const HostApp = dynamic(() => import("./HostApp").then((mod) => mod.HostApp), { ssr: false, loading });
const JoinHome = dynamic(() => import("@/platform/phone/components/JoinHome").then((mod) => mod.JoinHome), { ssr: false, loading });

/**
 * The site home. A computer gets the big screen menu. A phone gets the
 * join screen, since phones are the controllers, unless someone chose to
 * use it as the big screen. Only rendered in the browser (see HostEntry),
 * so the device can be read on the first render.
 */
export function SiteHome() {
  const [phone, setPhone] = useState(phoneHome);
  return phone ? <JoinHome onHostHere={() => setPhone(false)} /> : <HostApp />;
}
