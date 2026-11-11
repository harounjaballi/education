import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { getDictionary } from "@/lib/i18n/server";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "EduPlatform", template: "%s · EduPlatform" },
  description: "Plateforme d'enseignement en ligne pour établissements, enseignants et élèves.",
};

export const viewport: Viewport = { themeColor: "#0A1A31", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getDictionary();
  return (
    <html lang={locale} dir={dir} className={`${sans.variable} ${arabic.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
