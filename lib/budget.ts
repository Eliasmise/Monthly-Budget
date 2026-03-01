import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { UserBudgetConfig } from "@/lib/types";

interface UserRow {
  id: string;
  username: string;
  salary_amount: number | string;
  salary_currency: "HNL" | "USD";
}

interface AllocationRow {
  category_id: string;
  allocation_percent: number | string;
}

interface CategoryRow {
  id: string;
  name: string;
  is_active: boolean;
}

export async function getUserBudgetConfig(userId: string): Promise<UserBudgetConfig | null> {
  const supabase = getSupabaseServerClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, username, salary_amount, salary_currency")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    throw new Error(userError.message);
  }

  const userRow = user as UserRow | null;
  if (!userRow) {
    return null;
  }

  const { data: allocations, error: allocationError } = await supabase
    .from("user_category_budgets")
    .select("category_id, allocation_percent")
    .eq("user_id", userId)
    .returns<AllocationRow[]>();

  if (allocationError) {
    throw new Error(allocationError.message);
  }

  const categoryIds = (allocations ?? []).map((item) => item.category_id);
  let categoriesById = new Map<string, CategoryRow>();

  if (categoryIds.length > 0) {
    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id, name, is_active")
      .in("id", categoryIds)
      .returns<CategoryRow[]>();

    if (categoryError) {
      throw new Error(categoryError.message);
    }

    categoriesById = new Map((categories ?? []).map((category) => [category.id, category]));
  }

  return {
    user_id: userRow.id,
    username: userRow.username,
    salary_amount: Number(userRow.salary_amount ?? 0),
    salary_currency: userRow.salary_currency,
    allocations: (allocations ?? [])
      .map((item) => {
        const category = categoriesById.get(item.category_id);
        if (!category) return null;
        return {
          category_id: item.category_id,
          category_name: category.name,
          allocation_percent: Number(item.allocation_percent),
          is_active: category.is_active
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.category_name.localeCompare(b.category_name))
  };
}
