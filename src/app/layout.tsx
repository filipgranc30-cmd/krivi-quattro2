import type { Metadata, Viewport } from "next";
import { Barlow, Oswald } from "next/font/google";
import { AppProvider } from "@/components/app-provider";
import "./globals.css";

const body = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
});

const display = Oswald({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: "Krivi Quattro",
  description: "Pikado klub Krivi Quattro — raspored, liga i treninzi.",
  applicationName: "Krivi Quattro",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Krivi Quattro", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#070708",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr" className={`${body.variable} ${display.variable} h-full`}>
      <body className="min-h-full bg-ink text-white antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
