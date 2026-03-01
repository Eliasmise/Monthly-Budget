export type UserRole = "admin" | "user";
export type Currency = "HNL" | "USD";

export interface SessionPayload {
  userId: string;
  username: string;
  role: UserRole;
  exp: number;
}

export interface Category {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  category_id: string;
  amount: number;
  currency: Currency;
  expense_date: string;
  created_at: string;
  updated_at: string;
  category_name: string;
  username: string;
}

export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  currency?: Currency;
  search?: string;
}
