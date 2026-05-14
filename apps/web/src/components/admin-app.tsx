"use client";

import {
  BarChart3,
  Boxes,
  CreditCard,
  Globe,
  LogOut,
  Package,
  Receipt,
  Settings2,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { getDashboard, getSettings } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { LoginPage } from "@/components/views/login-page";
import { DashboardView } from "@/components/views/dashboard-view";
import { CatalogView } from "@/components/views/catalog-view";
import { CustomersView } from "@/components/views/customers-view";
import { OrdersView } from "@/components/views/orders-view";
import { InventoryView } from "@/components/views/inventory-view";
import { ExpensesView } from "@/components/views/expenses-view";
import { SettingsView } from "@/components/views/settings-view";
import { StorefrontView } from "@/components/views/storefront-view";
import { ErrorBoundary } from "@/components/error-boundary";

type ViewKey =
  | "dashboard"
  | "catalog"
  | "storefront"
  | "orders"
  | "customers"
  | "inventory"
  | "expenses"
  | "settings";

const navItems: {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "catalog", label: "Catalog", icon: Package },
  { key: "storefront", label: "Storefront", icon: Globe },
  { key: "orders", label: "Orders", icon: CreditCard },
  { key: "customers", label: "Customers", icon: Users },
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "settings", label: "Settings", icon: Settings2 },
];

export function AdminApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, admin, hydrated, clearAuth } = useAuthStore();

  const viewParam = searchParams.get("view");
  const view: ViewKey = navItems.some((item) => item.key === viewParam)
    ? (viewParam as ViewKey)
    : "dashboard";
  const inventoryProductId = searchParams.get("productId") || undefined;

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).isContentEditable) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/orders/new");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  if (!hydrated) {
    return <div className="min-h-screen bg-[#080808]" />;
  }

  if (!token || !admin) {
    return <LoginPage />;
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

        {/* User info — inline with top/bottom dividers */}
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
            const isActive = view === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => router.push(`/?view=${item.key}`)}
                className={`flex w-full cursor-pointer items-center gap-3 border-l-2 px-5 py-2.5 text-left text-sm tracking-wide transition-colors duration-150 ${
                  isActive
                    ? "border-[#c9a96e] bg-[#111] text-[#c9a96e]"
                    : "border-transparent text-[#666] hover:bg-[#111] hover:text-[#f0ede8]"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.key === "orders" ? (
                  <span className="rounded border border-[#333] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#555]">
                    N
                  </span>
                ) : null}
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
          {/* Page header */}
          <div>
            <h1 className="font-display text-5xl font-normal text-[#f0ede8]">
              {shopName}
            </h1>
            <hr className="mt-5 border-[#1e1e1e]" />
          </div>

          <ErrorBoundary key={view}>
            {view === "dashboard" && <DashboardView token={token} />}
            {view === "catalog" && <CatalogView token={token} />}
            {view === "storefront" && <StorefrontView token={token} />}
            {view === "orders" && <OrdersView token={token} />}
            {view === "customers" && <CustomersView token={token} />}
            {view === "inventory" && (
              <InventoryView
                key={inventoryProductId ?? "inventory"}
                token={token}
                initialProductId={inventoryProductId}
              />
            )}
            {view === "expenses" && <ExpensesView token={token} />}
            {view === "settings" && <SettingsView token={token} />}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
