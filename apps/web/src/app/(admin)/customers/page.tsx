"use client";

import { useAuthStore } from "@/lib/auth-store";
import { CustomersView } from "@/components/views/customers-view";

export default function CustomersPage() {
  const { token } = useAuthStore();
  if (!token) return null;
  return <CustomersView token={token} />;
}
