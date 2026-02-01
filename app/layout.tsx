import type { Metadata } from "next";
import { Outfit, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

import InAppBrowserGuard from "@/components/InAppBrowserGuard";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Daily Words",
  description: "Your daily source for German vocabulary and inspiration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${outfit.variable} ${notoSansKr.variable}`}>
        <InAppBrowserGuard />
        <Navbar />
        <main style={{ flex: 1, paddingTop: '80px' }}>{children}</main>
      </body>
    </html>
  );
}
