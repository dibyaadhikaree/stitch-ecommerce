"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  getCustomerById,
  getCustomers,
  updateCustomer,
  type Customer,
  type Order,
} from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, FormField } from "@/components/admin/primitives";

const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  website: "Website",
  manual: "Manual",
};

const CHANNEL_CLASSES: Record<string, string> = {
  instagram: "border-pink-500/30 bg-pink-500/10 text-pink-300",
  facebook: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  website: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  manual: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
};

function ChannelBadge({ channel }: { channel: string }) {
  return (
    <Badge
      variant="soft"
      className={cn("border text-[10px] leading-none", CHANNEL_CLASSES[channel] ?? CHANNEL_CLASSES.manual)}
    >
      {CHANNEL_LABELS[channel] ?? channel}
    </Badge>
  );
}

function CustomerSlideOver({
  customer,
  token,
  onClose,
}: {
  customer: Customer;
  token: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(customer.notes || "");

  const detailQuery = useQuery({
    queryKey: ["customer", customer._id],
    queryFn: () => getCustomerById(token, customer._id),
    staleTime: 30_000,
  });

  const notesMutation = useMutation({
    mutationFn: (value: string) => updateCustomer(token, customer._id, { notes: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", customer._id] });
    },
  });

  const orders: Order[] = detailQuery.data?.orders ?? [];

  const handleNotesBlur = useCallback(() => {
    if (notes !== customer.notes) {
      notesMutation.mutate(notes);
    }
  }, [notes, customer.notes, notesMutation]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-[#0a0a0a] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#1e1e1e] p-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Customer
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#f0ede8]">{customer.name}</h2>
            <div className="mt-2 flex items-center gap-2">
              <ChannelBadge channel={customer.channel} />
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-6 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[20px] border border-border/70 bg-background/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Total orders
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#f0ede8]">{customer.totalOrders}</p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Total spent
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#f0ede8]">
                {formatCurrency(customer.totalSpent)}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Phone</span>
              <a href={`tel:${customer.phone}`} className="font-medium text-[#c9a96e]">
                {customer.phone}
              </a>
            </div>
            {customer.address ? (
              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">Address</span>
                <span className="text-right text-[#f0ede8]">{customer.address}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">First seen</span>
              <span className="text-[#f0ede8]">
                {new Date(customer.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <FormField label="Internal notes">
            <Textarea
              className="min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="VIP, always late payment, etc."
            />
          </FormField>
          {notesMutation.isPending ? (
            <p className="text-xs text-muted-foreground">Saving notes...</p>
          ) : null}

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Order history
            </p>
            {detailQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading orders...</p>
            ) : orders.length ? (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="flex items-center justify-between rounded-[16px] border border-border/70 bg-background/50 px-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-muted-foreground">{order.orderNumber}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#f0ede8]">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{order.orderStatus}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No orders found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomersView({ token }: { token: string }) {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const customersQuery = useQuery({
    queryKey: ["customers", token],
    queryFn: () => getCustomers(token, { limit: 100 }),
    staleTime: 30_000,
  });

  const allCustomers = customersQuery.data?.items ?? [];

  const filteredCustomers = allCustomers.filter((c) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return c.name.toLowerCase().includes(query) || c.phone.includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-normal">Customers</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {customersQuery.data?.total ?? 0} total customer
            {(customersQuery.data?.total ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or phone..."
        className="max-w-sm"
      />

      {filteredCustomers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Customers are auto-created when orders are placed."
        />
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-border/70 bg-card/40">
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-border/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
            <span>Name</span>
            <span>Phone</span>
            <span>Channel</span>
            <span>Orders</span>
            <span>Spent</span>
            <span>Since</span>
          </div>
          <div className="divide-y divide-border/60">
            {filteredCustomers.map((customer) => (
              <button
                key={customer._id}
                type="button"
                onClick={() => setSelectedCustomer(customer)}
                className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-card md:grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_0.8fr] md:items-center md:gap-4"
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#f0ede8]">{customer.name}</p>
                  {customer.notes ? (
                    <span className="rounded-full border border-[#c9a96e]/30 bg-[#c9a96e]/10 px-1.5 py-0.5 text-[9px] text-[#c9a96e]">
                      Note
                    </span>
                  ) : null}
                </div>
                <div>
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-sm text-[#c9a96e] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {customer.phone}
                  </a>
                </div>
                <div>
                  <ChannelBadge channel={customer.channel} />
                </div>
                <p className="text-sm text-muted-foreground">{customer.totalOrders}</p>
                <p className="text-sm font-medium text-[#f0ede8]">
                  {formatCurrency(customer.totalSpent)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedCustomer ? (
        <CustomerSlideOver
          key={selectedCustomer._id}
          customer={selectedCustomer}
          token={token}
          onClose={() => setSelectedCustomer(null)}
        />
      ) : null}
    </div>
  );
}
