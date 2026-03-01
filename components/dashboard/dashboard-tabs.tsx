"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EntryTab } from "@/components/dashboard/entry-tab";
import { ReviewTab } from "@/components/dashboard/review-tab";
import { AnalyticsTab } from "@/components/dashboard/analytics-tab";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiJson } from "@/lib/client-api";
import type { Category } from "@/lib/types";

interface DashboardTabsProps {
  initialCategories: Category[];
  username: string;
  role: "admin" | "user";
}

export function DashboardTabs({ initialCategories, username, role }: DashboardTabsProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [refreshSignal, setRefreshSignal] = useState(0);

  async function refreshCategories() {
    try {
      const response = await apiJson<{ categories: Category[] }>("/api/categories");
      setCategories(response.categories.filter((category) => category.is_active));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to refresh categories";
      toast.error(message);
      throw error;
    }
  }

  useEffect(() => {
    void refreshCategories();
  }, []);

  function handleDataChange() {
    setRefreshSignal((prev) => prev + 1);
  }

  const hasCategories = useMemo(() => categories.length > 0, [categories]);

  return (
    <section className="space-y-6">
      <Card className="border-white/60 bg-card/90">
        <CardHeader>
          <CardTitle className="font-[var(--font-serif)] text-2xl">Welcome, {username}</CardTitle>
          <CardDescription>Track your daily expenses in Supabase with filters and analytics.</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="entry">
        <TabsList>
          <TabsTrigger value="entry">Entry</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="entry">
          <EntryTab
            categories={categories}
            hasCategories={hasCategories}
            onExpenseAdded={handleDataChange}
            onCategoriesRefresh={refreshCategories}
          />
        </TabsContent>

        <TabsContent value="review">
          <ReviewTab categories={categories} refreshSignal={refreshSignal} role={role} onDataChanged={handleDataChange} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab refreshSignal={refreshSignal} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
