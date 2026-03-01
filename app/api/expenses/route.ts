import { subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Currency } from "@/lib/types";
import { createExpenseSchema } from "@/lib/validators";

const EXPENSE_SELECT = `
  id,
  user_id,
  description,
  category_id,
  amount,
  currency,
  expense_date,
  created_at,
  updated_at,
  categories(name),
  users(username)
`;

interface ExpenseRow {
  amount: number | string;
  categories?: { name: string } | null;
  users?: { username: string } | null;
  [key: string]: unknown;
}

function mapExpense(expense: ExpenseRow) {
  return {
    ...expense,
    amount: Number(expense.amount),
    category_name: expense.categories?.name ?? "Uncategorized",
    username: expense.users?.username ?? "unknown"
  };
}

function isCurrency(value: string): value is Currency {
  return value === "HNL" || value === "USD";
}

export async function GET(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!authResult.ok) return authResult.response;

  const { session } = authResult;
  const params = req.nextUrl.searchParams;

  const startDate = params.get("startDate") || subDays(new Date(), 59).toISOString().slice(0, 10);
  const endDate = params.get("endDate") || new Date().toISOString().slice(0, 10);
  const categoryId = params.get("categoryId");
  const currency = params.get("currency");
  const search = params.get("search");
  const sortBy = params.get("sortBy") || "expense_date";
  const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";

  const sortableColumns = new Set(["expense_date", "amount", "created_at", "description"]);
  const orderBy = sortableColumns.has(sortBy) ? sortBy : "expense_date";

  const supabase = getSupabaseServerClient();

  let query = supabase.from("expenses").select(EXPENSE_SELECT).gte("expense_date", startDate).lte("expense_date", endDate);

  if (session.role !== "admin") {
    query = query.eq("user_id", session.userId);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (currency && isCurrency(currency)) {
    query = query.eq("currency", currency);
  }

  if (search) {
    query = query.ilike("description", `%${search}%`);
  }

  query = query.order(orderBy, { ascending: sortDir === "asc" });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expenses: (data ?? []).map(mapExpense) });
}

export async function POST(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!authResult.ok) return authResult.response;

  const { session } = authResult;

  try {
    const body = await req.json();
    const parsed = createExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }

    const { description, amount, categoryId, currency, expenseDate } = parsed.data;
    const supabase = getSupabaseServerClient();

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id, is_active")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError || !category || !category.is_active) {
      return NextResponse.json({ error: "Category not available" }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("expenses")
      .insert({
        user_id: session.userId,
        description,
        category_id: categoryId,
        amount,
        currency,
        expense_date: expenseDate
      })
      .select(EXPENSE_SELECT)
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ error: insertError?.message ?? "Failed to create expense" }, { status: 500 });
    }

    return NextResponse.json({ expense: mapExpense(inserted) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
