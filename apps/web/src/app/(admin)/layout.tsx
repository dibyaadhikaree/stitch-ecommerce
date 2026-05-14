import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080808]" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
