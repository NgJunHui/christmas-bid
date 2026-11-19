import type { Metadata, Viewport } from "next";
import { Fredoka, Geist } from "next/font/google";
import { Aurora } from "@/components/brand/aurora";
import { Snowfall } from "@/components/brand/snowfall";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const sans = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Bidmas", template: "%s · Bidmas" },
  description: "Pitch your gift, place your bids, and see who takes home what.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#163A2E",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        {/* Every page: flowing aurora + warm glows, then falling snow, then the page itself. */}
        <Aurora />
        <Snowfall />
        <div className="relative z-10">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
