import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "575 McKinney - Utility Bills",
  description: "Tenants' utility bills dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}

