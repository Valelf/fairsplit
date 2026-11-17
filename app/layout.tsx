import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairSplit — Fair Utility Bill Splitting",
  description: "Multi-tenant SaaS platform for fair utility bill splitting between landlords and tenants",
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

