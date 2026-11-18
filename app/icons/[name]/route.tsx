import { notFound } from "next/navigation";
import { renderAppIcon } from "../../_pwa/app-icon";

/**
 * PNG icons referenced by the web app manifest. Paths end in .png so the auth
 * middleware matcher skips them.
 */
const icons: Record<string, { size: number; padding: number }> = {
  "icon-192.png": { size: 192, padding: 0.18 },
  "icon-512.png": { size: 512, padding: 0.18 },
  "maskable-512.png": { size: 512, padding: 0.26 },
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(icons).map((name) => ({ name }));
}

export function GET(_req: Request, { params }: { params: { name: string } }) {
  const icon = icons[params.name];
  if (!icon) notFound();
  return renderAppIcon(icon.size, icon.padding);
}
