"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { getDashboard } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CHANNEL_COLORS: Record<string, string> = {
  instagram: "#ec4899",
  facebook: "#3b82f6",
  website: "#8b5cf6",
  manual: "#6b7280",
};

function statusVariant(status: string) {
  const value = status.toLowerCase();
  if (value === "delivered") return "success";
  if (value === "cancelled") return "danger";
  if (value === "shipped") return "pink";
  if (value === "pending") return "warning";
  return "soft";
}

function paymentVariant(payment: string) {
  const value = payment.toLowerCase();
  if (value === "cash") return "success";
  if (value === "bank_transfer") return "accent";
  if (value === "cod") return "warning";
  if (value === "esewa" || value === "khalti") return "pink";
  if (value === "unpaid") return "soft";
  return "soft";
}

function formatPaymentLabel(payment: string) {
  if (payment === "bank_transfer") return "Bank Transfer";
  if (payment === "esewa") return "eSewa";
  if (payment === "khalti") return "Khalti";
  if (payment === "cod") return "COD";
  if (payment === "unpaid") return "Unpaid";
  return payment;
}

function DashboardStatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-card/70 p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-3 font-display text-4xl leading-none ${
          tone === "positive"
            ? "text-emerald-300"
            : tone === "negative"
              ? "text-red-300"
              : tone === "warning"
                ? "text-amber-300"
                : "text-[#f0ede8]"
        }`}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

export function DashboardView({ token }: { token: string }) {
  const router = useRouter();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(token),
    staleTime: 30_000,
  });

  const data = dashboardQuery.data;

  if (!data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-[24px] bg-card/60" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-[24px] bg-card/60" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="h-[420px] rounded-[30px] bg-card/60" />
          <div className="space-y-6">
            <div className="h-[200px] rounded-[30px] bg-card/60" />
            <div className="h-[180px] rounded-[30px] bg-card/60" />
          </div>
        </div>
        <div className="h-[300px] rounded-[30px] bg-card/60" />
      </div>
    );
  }

  const maxChannelRevenue = Math.max(
    ...data.channelBreakdown.map((c) => c.revenue),
    1,
  );

  const avgDelta = data.avgOrderValue.currentWeek - data.avgOrderValue.lastWeek;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Revenue"
          value={formatCurrency(data.grossRevenue)}
        />
        <DashboardStatCard
          label="Profit"
          value={formatCurrency(data.netProfit)}
          tone={data.netProfit >= 0 ? "positive" : "negative"}
        />
        <DashboardStatCard
          label="Expenses"
          value={formatCurrency(data.totalExpenses)}
        />
        <DashboardStatCard
          label="Orders"
          value={String(data.totalOrders)}
          sub={`${data.ordersThisWeek} this week`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Active Orders"
          value={String(data.activeOrders)}
          sub={`${data.shippedOrders} shipped, ${data.deliveredOrders} delivered`}
          tone={data.activeOrders > 0 ? "warning" : "default"}
        />
        <DashboardStatCard
          label="Returns"
          value={String(data.returnedOrders)}
          sub={`${data.returnRate}% of delivered orders`}
          tone={data.returnedOrders > 0 ? "negative" : "default"}
        />
        <DashboardStatCard
          label="Repeat Customers"
          value={`${data.repeatCustomerRate}%`}
          tone={data.repeatCustomerRate > 30 ? "positive" : "default"}
        />
        <DashboardStatCard
          label="Avg Order Value"
          value={formatCurrency(data.avgOrderValue.currentWeek)}
          sub={
            avgDelta !== 0
              ? `${avgDelta > 0 ? "+" : ""}${formatCurrency(avgDelta)} vs last week`
              : "Same as last week"
          }
          tone={
            avgDelta > 0 ? "positive" : avgDelta < 0 ? "negative" : "default"
          }
        />
      </div>

      {data.codOutstanding > 0 ? (
        <Link href="/?view=orders" className="block">
          <div className="rounded-[24px] border border-[#c9a96e]/30 bg-[#c9a96e]/10 px-5 py-4 transition-colors hover:bg-[#c9a96e]/15">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#c9a96e]/70">
                  COD Outstanding
                </p>
                <p className="mt-1.5 font-display text-3xl leading-none text-[#c9a96e]">
                  {formatCurrency(data.codOutstanding)}
                </p>
              </div>
              <p className="text-sm text-[#c9a96e]/60">
                Cash to collect on active COD orders →
              </p>
            </div>
          </div>
        </Link>
      ) : null}

      {data.lowStockProducts.length ? (
        <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/10 px-4 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <p className="shrink-0 text-sm font-semibold text-amber-300">
              Low stock on {data.lowStockProducts.length} items
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.lowStockProducts.map((item, index) => (
                <button
                  key={`${item.productName}-${item.size}-${index}`}
                  type="button"
                  onClick={() => router.push(`/products/${item.productId}`)}
                  className="shrink-0 cursor-pointer rounded-full border border-amber-500/25 bg-black/20 px-3 py-1.5 text-xs text-amber-100 transition hover:border-amber-500/50 hover:bg-amber-500/15"
                >
                  {item.productName} / {item.size} — {item.stock} left
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[30px] border border-border/70 bg-card/70 p-6">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Weekly performance
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[#f0ede8]">
              Revenue and profit over 8 weeks
            </h3>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByWeek} barGap={10}>
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(255,255,255,0.08)"
                />
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                  stroke="#666"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                  stroke="#666"
                  tickFormatter={(value) =>
                    `NPR ${Number(value).toLocaleString()}`
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#0f0f0f",
                    color: "#f0ede8",
                  }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === "revenue" ? "Revenue" : "Profit",
                  ]}
                />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] border border-border/70 bg-card/70 p-6">
            <div className="mb-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Best sellers
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[#f0ede8]">
                Top products
              </h3>
            </div>

            <div className="space-y-3">
              {data.topProducts.map((product, index) => (
                <div
                  key={`${product.name}-${index}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[18px] border border-border/60 bg-background/40 px-4 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-[#f0ede8]">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f0ede8]">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.totalSold} units sold
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#f0ede8]">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
              {!data.topProducts.length ? (
                <p className="text-sm text-muted-foreground">
                  No delivered product sales yet.
                </p>
              ) : null}
            </div>
          </div>

          {data.channelBreakdown.length > 0 ? (
            <div className="rounded-[30px] border border-border/70 bg-card/70 p-6">
              <div className="mb-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Sales by source
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[#f0ede8]">
                  Channel breakdown
                </h3>
              </div>
              <div className="space-y-4">
                {data.channelBreakdown.map((entry) => {
                  const pct = Math.round(
                    (entry.revenue / maxChannelRevenue) * 100,
                  );
                  const color =
                    CHANNEL_COLORS[entry.channel] ?? CHANNEL_COLORS.manual;
                  return (
                    <div key={entry.channel}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium capitalize text-[#f0ede8]">
                          {entry.channel}
                        </span>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>{entry.orderCount} orders</span>
                          <span className="font-semibold text-[#f0ede8]">
                            {formatCurrency(entry.revenue)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[30px] border border-border/70 bg-card/70 p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Latest activity
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[#f0ede8]">
              Recent orders
            </h3>
          </div>
          <Button
            size="sm"
            onClick={() => router.push("/orders/new")}
            className="shrink-0 gap-2"
          >
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-border/60">
              <tr>
                {["Order", "Customer", "Total", "Status", "Payment"].map(
                  (label) => (
                    <th
                      key={label}
                      className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order, index) => (
                <tr
                  key={order.orderNumber}
                  className={
                    index % 2 === 0
                      ? "border-t border-border/40"
                      : "border-t border-border/40 bg-background/30"
                  }
                >
                  <td className="px-3 py-4 text-sm font-medium text-muted-foreground">
                    {order.orderNumber}
                  </td>
                  <td className="px-3 py-4 text-sm font-semibold text-[#f0ede8]">
                    {order.customerName}
                  </td>
                  <td className="px-3 py-4 text-sm font-semibold text-[#f0ede8]">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-3 py-4 text-sm">
                    <Badge variant={statusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-4 text-sm">
                    <Badge variant={paymentVariant(order.paymentStatus)}>
                      {formatPaymentLabel(order.paymentStatus)}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!data.recentOrders.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    No recent orders yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
