"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createExpense, deleteExpense, getExpenses, type Expense } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { EmptyState, FormField } from "@/components/admin/primitives";

const emptyExpenseForm = {
  title: "",
  category: "Operations",
  amount: "",
  note: "",
};

export function ExpensesView({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const expensesQuery = useQuery({
    queryKey: ["expenses", token],
    queryFn: () => getExpenses(token),
    staleTime: 30_000,
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["expenses"] }),
    ]);

  const expenseMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createExpense(token, payload),
    onSuccess: async () => {
      toast.success("Expense added");
      setExpenseForm(emptyExpenseForm);
      await refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add expense");
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(token, id),
    onSuccess: async () => {
      toast.success("Expense deleted");
      await refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete expense");
    },
  });

  const expenseToDelete = confirmDeleteId
    ? (expensesQuery.data?.items ?? []).find((e: Expense) => e._id === confirmDeleteId)
    : null;

  return (
    <>
      <AlertDialog
        open={Boolean(confirmDeleteId)}
        title="Delete expense"
        description={expenseToDelete ? `Delete "${expenseToDelete.title}"? This cannot be undone.` : "Delete this expense? This cannot be undone."}
        confirmLabel="Delete"
        isPending={deleteExpenseMutation.isPending}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) {
            deleteExpenseMutation.mutate(confirmDeleteId, {
              onSuccess: () => setConfirmDeleteId(null),
            });
          }
        }}
      />
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <Card className="rounded-[30px]">
        <CardHeader>
          <CardTitle>Add expense</CardTitle>
          <CardDescription>
            Track operating, sourcing, packaging, and marketing costs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Title">
            <Input
              value={expenseForm.title}
              onChange={(e) => setExpenseForm((c) => ({ ...c, title: e.target.value }))}
            />
          </FormField>
          <FormField label="Category">
            <Select
              value={expenseForm.category}
              onChange={(e) =>
                setExpenseForm((c) => ({ ...c, category: e.target.value }))
              }
            >
              <option value="Operations">Operations</option>
              <option value="Sourcing">Sourcing</option>
              <option value="Marketing">Marketing</option>
              <option value="Logistics">Logistics</option>
            </Select>
          </FormField>
          <FormField label="Amount">
            <Input
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm((c) => ({ ...c, amount: e.target.value }))}
            />
          </FormField>
          <FormField label="Note">
            <Textarea
              value={expenseForm.note}
              onChange={(e) => setExpenseForm((c) => ({ ...c, note: e.target.value }))}
            />
          </FormField>
          <Button
            className="w-full"
            onClick={() =>
              expenseMutation.mutate({
                ...expenseForm,
                amount: Number(expenseForm.amount),
              })
            }
            disabled={expenseMutation.isPending}
          >
            {expenseMutation.isPending ? "Saving expense..." : "Save expense"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[30px]">
        <CardHeader>
          <CardTitle>Expense ledger</CardTitle>
          <CardDescription>
            Visible spending helps make margin and replenishment decisions easier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {expensesQuery.isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-[22px] bg-muted/30" />
              ))}
            </div>
          ) : (expensesQuery.data?.items ?? []).length === 0 ? (
            <EmptyState
              title="No expenses recorded yet"
              description="Add your first expense using the form on the left."
            />
          ) : (
            (expensesQuery.data?.items ?? []).map((expense: Expense) => (
              <div
                key={expense._id}
                className="rounded-[22px] border border-border/70 bg-background/70 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{expense.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {expense.category} • {expense.note || "No note"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold">{formatCurrency(expense.amount)}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(expense._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
