"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiJson } from "@/lib/client-api";
import { expensesToCsv } from "@/lib/csv";
import { formatMoney } from "@/lib/utils";
import type { Category, Currency, Expense } from "@/lib/types";

interface ReviewTabProps {
  categories: Category[];
  refreshSignal: number;
  role: "admin" | "user";
  onDataChanged: () => void;
}

type SortBy = "expense_date" | "amount" | "created_at" | "description";

interface EditState {
  id: string;
  description: string;
  categoryId: string;
  amount: string;
  expenseDate: string;
  currency: Currency;
}

function defaultStartDate() {
  return subDays(new Date(), 59).toISOString().slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildQuery(filters: {
  startDate: string;
  endDate: string;
  categoryId: string;
  currency: string;
  search: string;
  sortBy: SortBy;
  sortDir: "asc" | "desc";
}) {
  const params = new URLSearchParams();
  params.set("startDate", filters.startDate);
  params.set("endDate", filters.endDate);
  if (filters.categoryId !== "all") params.set("categoryId", filters.categoryId);
  if (filters.currency !== "all") params.set("currency", filters.currency);
  if (filters.search) params.set("search", filters.search);
  params.set("sortBy", filters.sortBy);
  params.set("sortDir", filters.sortDir);
  return params.toString();
}

export function ReviewTab({ categories, refreshSignal, role, onDataChanged }: ReviewTabProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [categoryId, setCategoryId] = useState<string>("all");
  const [currency, setCurrency] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("expense_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const filters = useMemo(
    () => ({ startDate, endDate, categoryId, currency, search, sortBy, sortDir }),
    [startDate, endDate, categoryId, currency, search, sortBy, sortDir]
  );

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildQuery(filters);
      const response = await apiJson<{ expenses: Expense[] }>(`/api/expenses?${query}`);
      setExpenses(response.expenses);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load expenses";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadExpenses();
  }, [refreshSignal, loadExpenses]);

  function onExportCsv() {
    if (expenses.length === 0) {
      toast.error("No rows to export");
      return;
    }

    const csv = expensesToCsv(expenses);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onDelete(expenseId: string) {
    if (!window.confirm("Delete this expense?")) return;

    try {
      await apiJson<{ ok: true }>(`/api/expenses/${expenseId}`, { method: "DELETE" });
      toast.success("Expense deleted");
      onDataChanged();
      void loadExpenses();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete expense";
      toast.error(message);
    }
  }

  async function onSaveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await apiJson<{ expense: Expense }>(`/api/expenses/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: editing.description,
          categoryId: editing.categoryId,
          amount: Number(editing.amount),
          expenseDate: editing.expenseDate,
          currency: editing.currency
        })
      });
      toast.success("Expense updated");
      setIsEditOpen(false);
      setEditing(null);
      onDataChanged();
      void loadExpenses();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update expense";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const activeCategories = useMemo(() => categories.filter((category) => category.is_active), [categories]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {activeCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All currencies</SelectItem>
              <SelectItem value="HNL">HNL</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 md:col-span-2 lg:col-span-3">
          <Label htmlFor="search">Search description</Label>
          <Input
            id="search"
            placeholder="Search text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Sort by</Label>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense_date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="created_at">Created</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            >
              {sortDir === "asc" ? "Asc" : "Desc"}
            </Button>
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-4 flex items-center gap-2">
          <Button onClick={onExportCsv} type="button" variant="outline">
            Export CSV
          </Button>
          <Button onClick={() => void loadExpenses()} type="button" variant="secondary">
            Refresh
          </Button>
          {role === "admin" ? <span className="text-xs text-muted-foreground">Admin view includes all users</span> : null}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>Loading expenses...</TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No expenses found for the selected filters.</TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.expense_date}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.category_name}</TableCell>
                  <TableCell>{formatMoney(expense.amount, expense.currency)}</TableCell>
                  <TableCell>{expense.currency}</TableCell>
                  <TableCell>{expense.username}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => {
                          setEditing({
                            id: expense.id,
                            description: expense.description,
                            categoryId: expense.category_id,
                            amount: expense.amount.toString(),
                            expenseDate: expense.expense_date,
                            currency: expense.currency
                          });
                          setIsEditOpen(true);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Edit
                      </Button>

                      <Button onClick={() => void onDelete(expense.id)} size="sm" type="button" variant="destructive">
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
            <DialogDescription>Update expense details and save your changes.</DialogDescription>
          </DialogHeader>

          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
              </div>

              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={editing.categoryId} onValueChange={(value) => setEditing({ ...editing, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editing.amount}
                    onChange={(event) => setEditing({ ...editing, amount: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editing.expenseDate}
                    onChange={(event) => setEditing({ ...editing, expenseDate: event.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Currency</Label>
                <div className="inline-flex rounded-md border border-input bg-background p-1">
                  {(["HNL", "USD"] as Currency[]).map((option) => (
                    <button
                      className={`rounded px-4 py-2 text-sm font-medium transition ${
                        editing.currency === option
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      key={option}
                      onClick={(event) => {
                        event.preventDefault();
                        setEditing({ ...editing, currency: option });
                      }}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              disabled={saving}
              onClick={() => {
                setIsEditOpen(false);
                setEditing(null);
              }}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={saving || !editing} onClick={onSaveEdit} type="button">
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
