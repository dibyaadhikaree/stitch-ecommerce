import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "STITCH Studio Admin",
  description:
    "Admin panel for products, inventory, orders, expenses, and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full scroll-smooth antialiased"
      style={
        {
          "--font-body": '"Montserrat", "Avenir Next", "Segoe UI", sans-serif',
          "--font-cormorant":
            '"Cormorant Garamond", "Iowan Old Style", "Times New Roman", serif',
        } as CSSProperties
      }
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
