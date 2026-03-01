import type { Expense } from "@/lib/types";

function escapeCsv(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function expensesToCsv(expenses: Expense[]) {
  const header = ["Date", "Description", "Category", "Amount", "Currency", "User"];
  const rows = expenses.map((item) => [
    item.expense_date,
    item.description,
    item.category_name,
    item.amount,
    item.currency,
    item.username
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}
