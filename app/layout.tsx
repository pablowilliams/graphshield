import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://graphshield-investigations.wise-coot-3796.chatgpt.site"),
  title: "GraphShield | Explainable graph investigations",
  description: "Move from tabular fraud data to an explainable network investigation in minutes.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "GraphShield",
    description: "Explainable graph investigations, without graph expertise.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "GraphShield - Find the signal hidden between transactions." }],
  },
  twitter: { card: "summary_large_image", title: "GraphShield", description: "Explainable graph investigations, without graph expertise.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
