import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientLayout from "@/components/layout/ClientLayout";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "STITCH", template: "%s — STITCH" },
  description: "Premium minimal fashion.",
  openGraph: {
    siteName: "STITCH",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
