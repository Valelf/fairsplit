import type { MetadataRoute } from "next";

/**
 * Lets tenants add FairSplit to their home screen. No service worker: it always loads live data.
 * Colors match --brand (#0B7A63) and --background (#F5F7F6) in globals.css. PNG icons live in
 * public/icons (drawn from the brand glyph; app/icon.svg is the vector source).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FairSplit",
    short_name: "FairSplit",
    description: "Shared utility bills, split by the days each tenant lived there.",
    start_url: "/dashboard/tenant/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#0B7A63",
    background_color: "#F5F7F6",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
