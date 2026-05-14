"use client";

import { useAuthStore } from "@/lib/auth-store";
import { PromoView } from "@/components/views/promo-view";

export default function PromotionsPage() {
  const { token } = useAuthStore();
  if (!token) return null;
  return <PromoView token={token} />;
}
