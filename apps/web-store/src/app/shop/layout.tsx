import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the STITCH collection — premium minimal fashion.",
};

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
