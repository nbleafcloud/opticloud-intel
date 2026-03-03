import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opticloud Intel",
  description: "Daily intelligence feed for Opticloud — Energy, Cloud, Indigenous & Sustainable AI Policy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
