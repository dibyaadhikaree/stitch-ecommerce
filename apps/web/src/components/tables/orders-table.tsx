"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export type OrderRow = {
  id: string;
  customer: string;
  source: string;
  status: string;
  payment: string;
  total: number;
};

type BadgeVariant = "success" | "warning" | "danger" | "pink" | "accent" | "soft";

function statusVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (s === "completed" || s === "paid" || s === "delivered") return "success";
  if (s === "pending" || s === "processing") return "warning";
  if (s === "cancelled" || s === "refunded" || s === "failed") return "danger";
  if (s === "shipped" || s === "in transit") return "pink";
  return "soft";
}

function paymentVariant(payment: string): BadgeVariant {
  const p = payment.toLowerCase();
  if (p === "paid" || p === "completed") return "success";
  if (p === "pending" || p === "unpaid") return "warning";
  if (p === "failed" || p === "refunded") return "danger";
  return "soft";
}

const columns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: "id",
    header: "Order",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">#{row.original.id.slice(-6)}</span>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.customer}</span>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => <Badge variant="accent">{row.original.source}</Badge>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>
    ),
  },
  {
    accessorKey: "payment",
    header: "Payment",
    cell: ({ row }) => (
      <Badge variant={paymentVariant(row.original.payment)}>{row.original.payment}</Badge>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-semibold">{formatCurrency(row.original.total)}</span>
    ),
  },
];

type OrdersTableProps = {
  orders: OrderRow[];
  title?: string;
};

export function OrdersTable({ orders, title = "Recent multi-source orders" }: OrdersTableProps) {
  // TanStack Table exposes function-heavy state, so this targeted disable avoids a false positive.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-[30px] border border-border/70 bg-card/80">
      <div className="border-b border-border/70 px-6 py-5">
        <p className="font-display text-2xl font-normal tracking-tight">{title}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 text-left">
          <thead className="border-b border-border/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-t border-border/40 transition-colors hover:bg-secondary/40 ${
                  i % 2 === 0 ? "" : "bg-background/30"
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
