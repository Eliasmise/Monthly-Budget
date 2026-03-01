"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { startOfMonth } from "date-fns";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiJson } from "@/lib/client-api";
import { formatMoney } from "@/lib/utils";
import type { Expense, Currency } from "@/lib/types";

interface AnalyticsTabProps {
  refreshSignal: number;
}

interface Kpis {
  totalHnl: number;
  totalUsd: number;
  count: number;
  avgPerDaySelectedCurrency: number;
}

function defaultStartDate() {
  return startOfMonth(new Date()).toISOString().slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

export function AnalyticsTab({ refreshSignal }: AnalyticsTabProps) {
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [currency, setCurrency] = useState<Currency>("HNL");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const paramsAll = new URLSearchParams({ startDate, endDate, sortBy: "expense_date", sortDir: "asc" });
      const paramsByCurrency = new URLSearchParams({
        startDate,
        endDate,
        currency,
        sortBy: "expense_date",
        sortDir: "asc"
      });

      const [allResponse, byCurrencyResponse] = await Promise.all([
        apiJson<{ expenses: Expense[] }>(`/api/expenses?${paramsAll.toString()}`),
        apiJson<{ expenses: Expense[] }>(`/api/expenses?${paramsByCurrency.toString()}`)
      ]);

      setAllExpenses(allResponse.expenses);
      setExpenses(byCurrencyResponse.expenses);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load analytics";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, currency]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshSignal]);

  const kpis = useMemo<Kpis>(() => {
    const totalHnl = allExpenses
      .filter((item) => item.currency === "HNL")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalUsd = allExpenses
      .filter((item) => item.currency === "USD")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const count = allExpenses.length;
    const selectedTotal = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const diffDays = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
    return {
      totalHnl,
      totalUsd,
      count,
      avgPerDaySelectedCurrency: selectedTotal / diffDays
    };
  }, [allExpenses, expenses, startDate, endDate]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of expenses) {
      const key = item.category_name;
      map.set(key, (map.get(key) ?? 0) + Number(item.amount));
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of expenses) {
      const key = item.expense_date;
      map.set(key, (map.get(key) ?? 0) + Number(item.amount));
    }
    return Array.from(map.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="analytics-start">Start date</Label>
          <Input id="analytics-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="analytics-end">End date</Label>
          <Input id="analytics-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HNL">HNL</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total HNL</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(kpis.totalHnl, "HNL")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total USD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(kpis.totalUsd, "USD")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{kpis.count}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Avg/day ({currency})</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(kpis.avgPerDaySelectedCurrency, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spend by category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-25} textAnchor="end" interval={0} height={70} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatMoney(value, currency)} />
                  <Legend />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name={`Total (${currency})`} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily spend trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={byDay} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatMoney(value, currency)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    name={`Daily total (${currency})`}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
