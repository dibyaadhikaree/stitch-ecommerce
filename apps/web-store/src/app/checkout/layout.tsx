import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your STITCH order.",
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
