"use client";

import { Suspense } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { StorefrontView } from "@/components/views/storefront-view";

function StorefrontPageContent() {
  const { token } = useAuthStore();
  if (!token) return null;
  return <StorefrontView token={token} />;
}

export default function StorefrontPage() {
  return (
    <Suspense fallback={null}>
      <StorefrontPageContent />
    </Suspense>
  );
}
