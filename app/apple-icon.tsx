import { renderAppIcon } from "./_pwa/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS (iOS rounds the corners itself). */
export default function AppleIcon() {
  return renderAppIcon(size.width, 0.16);
}
