"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { InventoryView } from "@/components/views/inventory-view";

function InventoryPageContent() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId") || undefined;

  if (!token) return null;
  return (
    <InventoryView
      key={productId ?? "inventory"}
      token={token}
      initialProductId={productId}
    />
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <InventoryPageContent />
    </Suspense>
  );
}
