import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Collections",
  description: "Explore STITCH collections.",
};

export default function CollectionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
