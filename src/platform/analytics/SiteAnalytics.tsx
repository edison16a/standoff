"use client";
import { Analytics } from "@vercel/analytics/next";
import { privateUrl } from "./private-url";

/**
 * Vercel Web Analytics: page views only, no cookies. It sends nothing in
 * development. Room codes and player names are taken out of each address
 * first (see privateUrl).
 */
export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: privateUrl(event.url) })} />;
}
