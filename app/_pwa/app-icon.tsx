import { ImageResponse } from "next/og";

/** Brand teal and paper, matching --brand and --background in globals.css. */
export const BRAND_TEAL = "#0B7A63";
export const PAPER = "#F5F7F6";

/**
 * Renders the FairSplit glyph (a statement sheet split down the middle) as a
 * full-bleed square PNG. `padding` is the fraction of the edge kept clear,
 * which maskable icons need so launchers can crop to a circle.
 */
export function renderAppIcon(size: number, padding = 0.18) {
  const glyph = Math.round(size * (1 - padding * 2));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_TEAL,
        }}
      >
        <svg width={glyph} height={glyph} viewBox="4 4 20 20">
          <path d="M14 6v16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M7 10h4M7 14h4M7 18h2M17 10h4M17 14h3M17 18h4"
            stroke="#ffffff"
            strokeOpacity="0.7"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
