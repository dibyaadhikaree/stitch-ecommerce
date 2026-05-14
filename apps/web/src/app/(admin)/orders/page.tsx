"use client";

import { useAuthStore } from "@/lib/auth-store";
import { OrdersView } from "@/components/views/orders-view";

export default function OrdersPage() {
  const { token } = useAuthStore();
  if (!token) return null;
  return <OrdersView token={token} />;
}
