"use client";

import { useEffect } from "react";
import {
  BarChart3,
  Boxes,
  CreditCard,
  Globe,
  LogOut,
  Package,
  Receipt,
  Settings2,
  Tag,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { getDashboard, getSettings, getPendingOrderCount } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const navItems: {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/catalog", label: "Catalog", icon: Package },
  { path: "/storefront", label: "Storefront", icon: Globe },
  { path: "/orders", label: "Orders", icon: CreditCard },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/inventory", label: "Inventory", icon: Boxes },
  { path: "/promotions", label: "Promotions", icon: Tag },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/settings", label: "Settings", icon: Settings2 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, admin, hydrated, clearAuth } = useAuthStore();

  const settingsQuery = useQuery({
    queryKey: ["settings", token],
    queryFn: () => getSettings(token!),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(token!),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const pendingCountQuery = useQuery({
    queryKey: ["pending-count", token],
    queryFn: () => getPendingOrderCount(token!),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/");
    }
  }, [hydrated, token, router]);

  if (!hydrated || !token || !admin) {
    return <div className="min-h-screen bg-[#080808]" />;
  }

  const shopName = settingsQuery.data?.item?.shopName ?? "STITCH Studio";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080808]">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-[#1e1e1e] bg-[#0a0a0a]">
        {/* Brand */}
        <div className="px-5 pb-4 pt-6">
          <p className="font-display text-[28px] font-normal tracking-[0.15em] text-[#f0ede8]">
            STITCH
          </p>
          <p className="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-[#444]">
            Admin Panel
          </p>
        </div>

        {/* User info */}
        <div className="border-b border-t border-[#1e1e1e] px-5 py-3">
          <p className="text-sm font-medium text-[#f0ede8]">{admin.name}</p>
          <p className="mt-0.5 text-xs text-[#555]">{admin.email}</p>
          <p className="mt-1.5 text-[9px] uppercase tracking-[0.22em] text-[#c9a96e]">
            {admin.role}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.path || pathname.startsWith(item.path + "/");
            const pendingCount = pendingCountQuery.data?.count ?? 0;
            const showBadge = item.label === "Orders" && pendingCount > 0;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => router.push(item.path)}
                className={`flex w-full cursor-pointer items-center gap-3 border-l-2 px-5 py-2.5 text-left text-sm tracking-wide transition-colors duration-150 ${
                  isActive
                    ? "border-[#c9a96e] bg-[#111] text-[#c9a96e]"
                    : "border-transparent text-[#666] hover:bg-[#111] hover:text-[#f0ede8]"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: "var(--color-background-danger)",
                      color: "var(--color-text-danger)",
                      fontSize: "10px",
                      fontWeight: 500,
                      minWidth: "18px",
                      height: "18px",
                      borderRadius: "9px",
                    }}
                  >
                    {pendingCount}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          type="button"
          onClick={() => clearAuth()}
          className="flex cursor-pointer items-center gap-2 px-5 py-4 text-left text-xs uppercase tracking-widest text-[#444] transition-colors duration-150 hover:text-[#e05252]"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Logout
        </button>
      </aside>

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="h-screen flex-1 overflow-y-auto">
        <div className="space-y-8 p-8">
          <div>
            <h1 className="font-display text-5xl font-normal text-[#f0ede8]">
              {shopName}
            </h1>
            <hr className="mt-5 border-[#1e1e1e]" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
