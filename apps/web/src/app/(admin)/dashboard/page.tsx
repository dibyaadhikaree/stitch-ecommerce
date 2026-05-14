"use client";

import { useAuthStore } from "@/lib/auth-store";
import { DashboardView } from "@/components/views/dashboard-view";

export default function DashboardPage() {
  const { token } = useAuthStore();
  if (!token) return null;
  return <DashboardView token={token} />;
}
