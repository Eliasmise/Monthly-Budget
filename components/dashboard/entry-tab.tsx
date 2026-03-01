"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiJson } from "@/lib/client-api";
import { todayDateInputValue } from "@/lib/utils";
import type { Category, Currency, Expense } from "@/lib/types";

interface EntryTabProps {
  categories: Category[];
  hasCategories: boolean;
  onExpenseAdded: () => void;
  onCategoriesRefresh: () => Promise<void>;
}

const CURRENCIES: Currency[] = ["HNL", "USD"];

export function EntryTab({ categories, hasCategories, onExpenseAdded, onCategoriesRefresh }: EntryTabProps) {
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayDateInputValue());
  const [currency, setCurrency] = useState<Currency>("HNL");
  const [loading, setLoading] = useState(false);

  const categoriesByName = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  useEffect(() => {
    if (!categoryId && categoriesByName.length > 0) {
      setCategoryId(categoriesByName[0].id);
    }
  }, [categoryId, categoriesByName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!categoryId) {
      toast.error("Please choose a category");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        description,
        categoryId,
        amount: Number(amount),
        expenseDate,
        currency
      };

      await apiJson<{ expense: Expense }>("/api/expenses", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      onExpenseAdded();
      setDescription("");
      setAmount("");
      setExpenseDate(todayDateInputValue());
      setCurrency("HNL");

      toast.success("Expense added");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create expense";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshCategories() {
    try {
      await onCategoriesRefresh();
      toast.success("Categories refreshed");
    } catch {
      toast.error("Could not refresh categories");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-[var(--font-serif)] text-2xl">Log Expense</CardTitle>
        <CardDescription>Add a new expense. Date defaults to today and can be adjusted.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasCategories ? (
          <div className="space-y-4 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No active categories found. Ask an admin to create one, then refresh categories.
            <div>
              <Button onClick={refreshCategories} size="sm" variant="outline">
                Refresh categories
              </Button>
            </div>
          </div>
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What did you spend on?"
                required
                value={description}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                onValueChange={setCategoryId}
                value={categoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesByName.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                inputMode="decimal"
                min="0"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={amount}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseDate">Date</Label>
              <Input
                id="expenseDate"
                onChange={(event) => setExpenseDate(event.target.value)}
                required
                type="date"
                value={expenseDate}
              />
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <div className="inline-flex rounded-md border border-input bg-background p-1">
                {CURRENCIES.map((option) => (
                  <button
                    className={`rounded px-4 py-2 text-sm font-medium transition ${
                      currency === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    key={option}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrency(option);
                    }}
                    type="button"
                  >
                    {option === "HNL" ? "HNL (Lempiras)" : "USD"}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <Button disabled={loading} type="submit">
                {loading ? "Adding..." : "Add expense"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
