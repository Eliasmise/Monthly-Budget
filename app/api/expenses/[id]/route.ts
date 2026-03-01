import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { updateExpenseSchema } from "@/lib/validators";

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

async function canAccessExpense(expenseId: string, userId: string, role: "admin" | "user") {
  const supabase = getSupabaseServerClient();
  const { data: expense } = await supabase.from("expenses").select("id, user_id").eq("id", expenseId).maybeSingle();

  if (!expense) return false;
  if (role === "admin") return true;
  return expense.user_id === userId;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireSession(req);
  if (!authResult.ok) return authResult.response;

  const { id } = params;
  const { session } = authResult;

  if (!(await canAccessExpense(id, session.userId, session.role))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = updateExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const payload = parsed.data;
    const updateData: Record<string, string | number> = {};

    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.categoryId !== undefined) {
      const supabase = getSupabaseServerClient();
      const { data: category } = await supabase
        .from("categories")
        .select("id, is_active")
        .eq("id", payload.categoryId)
        .maybeSingle();
      if (!category || !category.is_active) {
        return NextResponse.json({ error: "Category not available" }, { status: 400 });
      }
      updateData.category_id = payload.categoryId;
    }
    if (payload.amount !== undefined) updateData.amount = payload.amount;
    if (payload.currency !== undefined) updateData.currency = payload.currency;
    if (payload.expenseDate !== undefined) updateData.expense_date = payload.expenseDate;

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("expenses")
      .update(updateData)
      .eq("id", id)
      .select(EXPENSE_SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ expense: mapExpense(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireSession(req);
  if (!authResult.ok) return authResult.response;

  const { id } = params;
  const { session } = authResult;

  if (!(await canAccessExpense(id, session.userId, session.role))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
