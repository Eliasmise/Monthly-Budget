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
  salary_amount: number;
  salary_currency: Currency;
  created_at: string;
}

export interface BudgetAllocation {
  category_id: string;
  category_name: string;
  allocation_percent: number;
  is_active: boolean;
}

export interface UserBudgetConfig {
  user_id: string;
  username: string;
  salary_amount: number;
  salary_currency: Currency;
  allocations: BudgetAllocation[];
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  currency?: Currency;
  search?: string;
}
