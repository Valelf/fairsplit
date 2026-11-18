import type { MetadataRoute } from "next";
import { BRAND_TEAL, PAPER } from "./_pwa/app-icon";

/** Lets tenants add FairSplit to their home screen. No service worker: it always loads live data. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FairSplit",
    short_name: "FairSplit",
    description: "Shared utility bills, split by the days each tenant lived there.",
    start_url: "/dashboard/tenant/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: BRAND_TEAL,
    background_color: PAPER,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
