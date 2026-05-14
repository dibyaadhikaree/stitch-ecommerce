"use client";

import { Suspense } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { CatalogView } from "@/components/views/catalog-view";

function CatalogPageContent() {
  const { token } = useAuthStore();
  if (!token) return null;
  return <CatalogView token={token} />;
}

export default function CatalogPage() {
  return (
    <Suspense fallback={null}>
      <CatalogPageContent />
    </Suspense>
  );
}
