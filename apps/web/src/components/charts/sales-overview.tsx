"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

type SalesPoint = { month: string; revenue: number; profit: number };
type InventoryMixPoint = { name: string; value: number };

const inventoryColors = ["#111111", "#535353", "#8d8d8d", "#d6d6d6"];

type SalesOverviewProps = {
  inventoryMix: InventoryMixPoint[];
  salesData: SalesPoint[];
};

export function SalesOverview({ inventoryMix, salesData }: SalesOverviewProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-[30px] border border-border/70 bg-card/80 p-6">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
            Revenue and profit
          </p>
          <h3 className="mt-2 text-2xl font-semibold">Six-month performance trend</h3>
        </div>
        <div className="h-70">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#111111" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#111111" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#c9a46a" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#c9a46a" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} />
              <Tooltip
                contentStyle={{
                  borderRadius: 20,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#111111"
                fill="url(#revenueGradient)"
                strokeWidth={2.4}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#c9a46a"
                fill="url(#profitGradient)"
                strokeWidth={2.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[30px] border border-border/70 bg-card/80 p-6">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
            Inventory mix
          </p>
          <h3 className="mt-2 text-2xl font-semibold">Category distribution</h3>
        </div>
        <div className="h-70">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={inventoryMix}
                innerRadius={58}
                outerRadius={92}
                paddingAngle={4}
                dataKey="value"
              >
                {inventoryMix.map((entry, index) => (
                  <Cell key={entry.name} fill={inventoryColors[index % inventoryColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 20,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-5 grid gap-3">
          {inventoryMix.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: inventoryColors[index % inventoryColors.length] }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
