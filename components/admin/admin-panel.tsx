"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiJson } from "@/lib/client-api";
import { formatMoney } from "@/lib/utils";
import type { AppUser, Category, Currency, UserBudgetConfig, UserRole } from "@/lib/types";

export function AdminPanel() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [selectedBudgetUserId, setSelectedBudgetUserId] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("0");
  const [salaryCurrency, setSalaryCurrency] = useState<Currency>("HNL");
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({});
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);

  const activeCategories = useMemo(() => categories.filter((category) => category.is_active), [categories]);

  const totalAllocationPercent = useMemo(
    () =>
      activeCategories.reduce((sum, category) => {
        const value = Number(allocationInputs[category.id] || "0");
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [activeCategories, allocationInputs]
  );

  function buildEmptyAllocationInputs(sourceCategories: Category[]) {
    return Object.fromEntries(sourceCategories.filter((category) => category.is_active).map((category) => [category.id, "0"]));
  }

  const loadBudgetForUser = useCallback(
    async (userId: string, sourceCategories: Category[]) => {
      if (!userId) return;

      setBudgetLoading(true);
      try {
        const response = await apiJson<{ budget: UserBudgetConfig }>(`/api/admin/budgets?userId=${userId}`);
        const budget = response.budget;

        const inputs = buildEmptyAllocationInputs(sourceCategories);
        for (const allocation of budget.allocations) {
          if (allocation.category_id in inputs) {
            inputs[allocation.category_id] = allocation.allocation_percent.toString();
          }
        }

        setSalaryAmount(budget.salary_amount.toString());
        setSalaryCurrency(budget.salary_currency);
        setAllocationInputs(inputs);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load budget setup";
        toast.error(message);
      } finally {
        setBudgetLoading(false);
      }
    },
    []
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, categoriesResponse] = await Promise.all([
        apiJson<{ users: AppUser[] }>("/api/admin/users"),
        apiJson<{ categories: Category[] }>("/api/categories")
      ]);

      setUsers(usersResponse.users);
      setCategories(categoriesResponse.categories);

      const nextUserId = usersResponse.users[0]?.id ?? "";
      setSelectedBudgetUserId((current) => {
        if (current && usersResponse.users.some((user) => user.id === current)) {
          return current;
        }
        return nextUserId;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load admin data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedBudgetUserId || categories.length === 0) return;
    void loadBudgetForUser(selectedBudgetUserId, categories);
  }, [selectedBudgetUserId, categories, loadBudgetForUser]);

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await apiJson<{ user: AppUser }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ username: newUsername, role: newRole, password: newUserPassword })
      });
      setNewUsername("");
      setNewRole("user");
      setNewUserPassword("");
      toast.success("User created");
      await loadAll();
      setSelectedBudgetUserId(response.user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add user";
      toast.error(message);
    }
  }

  async function toggleUserRole(user: AppUser) {
    const nextRole: UserRole = user.role === "admin" ? "user" : "admin";

    try {
      await apiJson<{ user: AppUser }>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole })
      });
      toast.success("User role updated");
      await loadAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update role";
      toast.error(message);
    }
  }

  async function deleteUser(userId: string) {
    if (!window.confirm("Delete this user and all their expenses?")) return;

    try {
      await apiJson<{ ok: true }>(`/api/admin/users/${userId}`, { method: "DELETE" });
      toast.success("User deleted");
      await loadAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete user";
      toast.error(message);
    }
  }

  async function setUserPassword(user: AppUser) {
    const password = window.prompt(`Set new password for ${user.username}:`);
    if (password === null) return;
    if (password.length === 0) {
      toast.error("Password cannot be empty");
      return;
    }

    try {
      await apiJson<{ user: AppUser }>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password })
      });
      toast.success(`Password updated for ${user.username}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update password";
      toast.error(message);
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiJson<{ category: Category }>("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName })
      });
      setNewCategoryName("");
      toast.success("Category added");
      await loadAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add category";
      toast.error(message);
    }
  }

  async function toggleCategory(category: Category) {
    try {
      await apiJson<{ category: Category }>(`/api/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !category.is_active })
      });
      toast.success(`Category ${category.is_active ? "deactivated" : "activated"}`);
      await loadAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update category";
      toast.error(message);
    }
  }

  async function deleteCategory(categoryId: string) {
    if (!window.confirm("Delete this category permanently?")) return;

    try {
      await apiJson<{ ok: true }>(`/api/categories/${categoryId}`, { method: "DELETE" });
      toast.success("Category deleted");
      await loadAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete category";
      toast.error(message);
    }
  }

  async function saveBudgetSetup() {
    if (!selectedBudgetUserId) {
      toast.error("Select a user first");
      return;
    }

    if (totalAllocationPercent > 100.0001) {
      toast.error("Total category allocation cannot exceed 100%.");
      return;
    }

    setBudgetSaving(true);
    try {
      const allocations = activeCategories.map((category) => ({
        categoryId: category.id,
        allocationPercent: Number(allocationInputs[category.id] || "0")
      }));

      await apiJson<{ budget: UserBudgetConfig }>("/api/admin/budgets", {
        method: "PUT",
        body: JSON.stringify({
          userId: selectedBudgetUserId,
          salaryAmount: Number(salaryAmount || "0"),
          salaryCurrency,
          allocations
        })
      });

      toast.success("Budget setup saved");
      await loadAll();
      await loadBudgetForUser(selectedBudgetUserId, categories);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save budget setup";
      toast.error(message);
    } finally {
      setBudgetSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-[var(--font-serif)] text-2xl">Admin</CardTitle>
          <CardDescription>Manage users, categories, and per-user budget allocations.</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="budgets">User Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Create, delete, and manage user roles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]" onSubmit={addUser}>
                <div className="space-y-1">
                  <Label htmlFor="new-user">Username</Label>
                  <Input
                    id="new-user"
                    placeholder="new_user"
                    required
                    value={newUsername}
                    onChange={(event) => setNewUsername(event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="new-user-password">Password</Label>
                  <Input
                    id="new-user-password"
                    placeholder="Simple password"
                    required
                    type="password"
                    value={newUserPassword}
                    onChange={(event) => setNewUserPassword(event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button type="submit">Add user</Button>
                </div>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4}>Loading users...</TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>No users found.</TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>{formatMoney(Number(user.salary_amount || 0), user.salary_currency)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => void toggleUserRole(user)}>
                              Make {user.role === "admin" ? "User" : "Admin"}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => void setUserPassword(user)}>
                              Set Password
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => void deleteUser(user.id)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Add new categories, toggle active status, or delete when unused.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="flex gap-3" onSubmit={addCategory}>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="new-category">Category name</Label>
                  <Input
                    id="new-category"
                    placeholder="e.g. Transport"
                    required
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit">Add category</Button>
                </div>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3}>Loading categories...</TableCell>
                    </TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>No categories found.</TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>{category.name}</TableCell>
                        <TableCell>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => void toggleCategory(category)}>
                              {category.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => void deleteCategory(category.id)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets">
          <Card>
            <CardHeader>
              <CardTitle>User Budgets</CardTitle>
              <CardDescription>
                Set each user salary and how much percentage can be spent by category.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Create users first to configure budgets.</p>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>User</Label>
                      <Select value={selectedBudgetUserId} onValueChange={setSelectedBudgetUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="salary-amount">Salary / Total budget</Label>
                      <Input
                        id="salary-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={salaryAmount}
                        onChange={(event) => setSalaryAmount(event.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Salary currency</Label>
                      <Select value={salaryCurrency} onValueChange={(value) => setSalaryCurrency(value as Currency)}>
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

                  <div className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">Category allocations</p>
                        <p className="text-sm text-muted-foreground">Set percentage per category (total max 100%).</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${totalAllocationPercent > 100 ? "text-destructive" : ""}`}>
                          Total: {totalAllocationPercent.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Remaining: {(100 - totalAllocationPercent).toFixed(2)}%</p>
                      </div>
                    </div>

                    {budgetLoading ? (
                      <p className="text-sm text-muted-foreground">Loading budget setup...</p>
                    ) : activeCategories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active categories available.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Allocation %</TableHead>
                            <TableHead>Allocated Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeCategories.map((category) => {
                            const percent = Number(allocationInputs[category.id] || "0");
                            const base = Number(salaryAmount || "0");
                            const allocatedAmount = (base * percent) / 100;

                            return (
                              <TableRow key={category.id}>
                                <TableCell>{category.name}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={allocationInputs[category.id] ?? "0"}
                                    onChange={(event) =>
                                      setAllocationInputs((current) => ({
                                        ...current,
                                        [category.id]: event.target.value
                                      }))
                                    }
                                  />
                                </TableCell>
                                <TableCell>{formatMoney(allocatedAmount, salaryCurrency)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <Button disabled={budgetSaving || totalAllocationPercent > 100} onClick={() => void saveBudgetSetup()}>
                    {budgetSaving ? "Saving..." : "Save budget setup"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
