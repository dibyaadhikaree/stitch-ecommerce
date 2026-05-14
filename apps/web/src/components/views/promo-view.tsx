"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createPromoCode,
  deletePromoCode,
  getPromoCodes,
  togglePromoCode,
  type PromoCode,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, FormField } from "@/components/admin/primitives";

const emptyForm = {
  code: "",
  type: "percent" as "percent" | "flat",
  value: "",
  minOrderValue: "",
  maxUses: "",
  expiresAt: "",
};

function formatExpiry(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PromoView({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const codesQuery = useQuery({
    queryKey: ["promo-codes", token],
    queryFn: () => getPromoCodes(token),
    staleTime: 30_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["promo-codes"] });

  const createMutation = useMutation({
    mutationFn: () =>
      createPromoCode(token, {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: Number(form.value),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
        isActive: true,
      }),
    onSuccess: async () => {
      toast.success("Promo code created");
      setForm(emptyForm);
      await invalidate();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create promo code",
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      togglePromoCode(token, id, isActive),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update promo code",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePromoCode(token, id),
    onSuccess: async () => {
      toast.success("Promo code deleted");
      setConfirmDeleteId(null);
      await invalidate();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete promo code",
      );
    },
  });

  const codes = codesQuery.data?.items ?? [];

  const canCreate =
    form.code.trim().length > 0 &&
    form.value !== "" &&
    Number(form.value) > 0 &&
    !createMutation.isPending;

  return (
    <div className="space-y-8">
      <h2 className="font-display text-2xl font-normal text-[#f0ede8]">
        Promo codes
      </h2>

      {/* Create form */}
      <div className="border border-[#1e1e1e] bg-[#0a0a0a] p-6">
        <p className="mb-5 text-xs uppercase tracking-[0.2em] text-[#555]">
          New code
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <FormField label="Code">
            <Input
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              placeholder="SUMMER20"
              className="uppercase"
            />
          </FormField>

          <FormField label="Type">
            <Select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as "percent" | "flat",
                }))
              }
            >
              <option value="percent">Percent off</option>
              <option value="flat">Flat amount off</option>
            </Select>
          </FormField>

          <FormField
            label={form.type === "percent" ? "Percent (%)" : "Amount (NPR)"}
          >
            <Input
              type="number"
              min={0}
              max={form.type === "percent" ? 100 : undefined}
              value={form.value}
              onChange={(e) =>
                setForm((f) => ({ ...f, value: e.target.value }))
              }
              placeholder={form.type === "percent" ? "20" : "500"}
            />
          </FormField>

          <FormField label="Min order (NPR, optional)">
            <Input
              type="number"
              min={0}
              value={form.minOrderValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, minOrderValue: e.target.value }))
              }
              placeholder="0"
            />
          </FormField>

          <FormField label="Max uses (optional)">
            <Input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxUses: e.target.value }))
              }
              placeholder="Unlimited"
            />
          </FormField>

          <FormField label="Expiry date (optional)">
            <Input
              type="date"
              value={form.expiresAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, expiresAt: e.target.value }))
              }
            />
          </FormField>
        </div>

        <div className="mt-5">
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canCreate}
            size="sm"
          >
            {createMutation.isPending ? "Creating..." : "Create code"}
          </Button>
        </div>
      </div>

      {/* Codes table */}
      {codes.length === 0 ? (
        <EmptyState
          title="No promo codes yet"
          description="Create your first promo code above."
        />
      ) : (
        <div className="border border-[#1e1e1e]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e1e] text-left">
                {[
                  "Code",
                  "Type",
                  "Value",
                  "Min order",
                  "Uses",
                  "Expiry",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[9px] font-normal uppercase tracking-[0.2em] text-[#555]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((promo: PromoCode) => (
                <tr
                  key={promo._id}
                  className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#0f0f0f]"
                >
                  <td className="px-4 py-3 font-mono text-xs tracking-wider text-[#f0ede8]">
                    {promo.code}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-[#888]">
                    {promo.type}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#f0ede8]">
                    {promo.type === "percent"
                      ? `${promo.value}%`
                      : `NPR ${promo.value}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#888]">
                    {promo.minOrderValue > 0
                      ? `NPR ${promo.minOrderValue}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#888]">
                    {promo.usedCount}
                    {promo.maxUses !== null ? ` / ${promo.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#888]">
                    {formatExpiry(promo.expiresAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] uppercase tracking-[0.14em] ${
                        promo.isActive ? "text-[#5a9b5a]" : "text-[#555]"
                      }`}
                    >
                      {promo.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: promo._id,
                            isActive: !promo.isActive,
                          })
                        }
                        disabled={toggleMutation.isPending}
                        className="text-[10px] uppercase tracking-[0.14em] text-[#666] transition-colors hover:text-[#f0ede8]"
                      >
                        {promo.isActive ? "Disable" : "Enable"}
                      </button>

                      {confirmDeleteId === promo._id ? (
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(promo._id)}
                            disabled={deleteMutation.isPending}
                            className="text-[10px] uppercase tracking-[0.14em] text-[#e05252] transition-colors hover:text-[#ff6b6b]"
                          >
                            {deleteMutation.isPending ? "..." : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] uppercase tracking-[0.14em] text-[#555] transition-colors hover:text-[#f0ede8]"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(promo._id)}
                          className="text-[10px] uppercase tracking-[0.14em] text-[#555] transition-colors hover:text-[#e05252]"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
