"use client";

import { useAuthStore } from "@/lib/auth-store";
import { ExpensesView } from "@/components/views/expenses-view";

export default function ExpensesPage() {
  const { token } = useAuthStore();
  if (!token) return null;
  return <ExpensesView token={token} />;
}
