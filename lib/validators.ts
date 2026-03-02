import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(2, "Username must have at least 2 characters")
  .max(50, "Username is too long")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, _, -, .");

export const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .max(128, "Password is too long");

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema
});

export const createExpenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(180),
  categoryId: z.string().uuid("Invalid category"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  currency: z.enum(["HNL", "USD"]),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid expense date")
});

export const updateExpenseSchema = createExpenseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be updated"
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80)
});

export const userSchema = z.object({
  username: usernameSchema,
  role: z.enum(["admin", "user"]).default("user"),
  password: passwordSchema
});

export const roleSchema = z.object({
  role: z.enum(["admin", "user"])
});

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(["admin", "user"]).optional(),
    password: passwordSchema.optional()
  })
  .refine((value) => value.role !== undefined || value.password !== undefined, {
    message: "At least role or password must be provided"
  });

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema
});

export const budgetAllocationSchema = z.object({
  categoryId: z.string().uuid("Invalid category"),
  allocationPercent: z.coerce.number().min(0, "Allocation cannot be negative").max(100, "Allocation cannot exceed 100")
});

export const updateUserBudgetSchema = z.object({
  userId: z.string().uuid("Invalid user"),
  salaryAmount: z.coerce.number().min(0, "Salary cannot be negative"),
  salaryCurrency: z.enum(["HNL", "USD"]),
  allocations: z.array(budgetAllocationSchema)
});
