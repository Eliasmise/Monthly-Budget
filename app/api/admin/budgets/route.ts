import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-auth";
import { getUserBudgetConfig } from "@/lib/budget";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { updateUserBudgetSchema } from "@/lib/validators";

function normalizeAllocations(items: Array<{ categoryId: string; allocationPercent: number }>) {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.categoryId, Number(item.allocationPercent));
  }
  return Array.from(map.entries()).map(([categoryId, allocationPercent]) => ({ categoryId, allocationPercent }));
}

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (!authResult.ok) return authResult.response;

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const budget = await getUserBudgetConfig(userId);
    if (!budget) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ budget });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load budget";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (!authResult.ok) return authResult.response;

  const body = await req.json();
  const parsed = updateUserBudgetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const { userId, salaryAmount, salaryCurrency } = parsed.data;
  const allocations = normalizeAllocations(parsed.data.allocations).filter((item) => item.allocationPercent > 0);
  const totalPercent = allocations.reduce((sum, item) => sum + item.allocationPercent, 0);

  if (totalPercent > 100.0001) {
    return NextResponse.json({ error: "Total allocation cannot exceed 100%" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();

    const { data: user } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const categoryIds = allocations.map((item) => item.categoryId);
    if (categoryIds.length > 0) {
      const { data: categories, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .in("id", categoryIds)
        .eq("is_active", true);

      if (categoryError) {
        return NextResponse.json({ error: categoryError.message }, { status: 500 });
      }

      if ((categories ?? []).length !== categoryIds.length) {
        return NextResponse.json({ error: "One or more categories are invalid or inactive" }, { status: 400 });
      }
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        salary_amount: salaryAmount,
        salary_currency: salaryCurrency
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: deleteError } = await supabase.from("user_category_budgets").delete().eq("user_id", userId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (allocations.length > 0) {
      const { error: insertError } = await supabase.from("user_category_budgets").insert(
        allocations.map((item) => ({
          user_id: userId,
          category_id: item.categoryId,
          allocation_percent: item.allocationPercent
        }))
      );

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const budget = await getUserBudgetConfig(userId);
    if (!budget) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ budget });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save budget";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
