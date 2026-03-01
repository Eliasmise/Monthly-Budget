"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiJson } from "@/lib/client-api";
import type { AppUser, Category, UserRole } from "@/lib/types";

export function AdminPanel() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [newCategoryName, setNewCategoryName] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const [usersResponse, categoriesResponse] = await Promise.all([
        apiJson<{ users: AppUser[] }>("/api/admin/users"),
        apiJson<{ categories: Category[] }>("/api/categories")
      ]);

      setUsers(usersResponse.users);
      setCategories(categoriesResponse.categories);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load admin data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiJson<{ user: AppUser }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ username: newUsername, role: newRole })
      });
      setNewUsername("");
      setNewRole("user");
      toast.success("User created");
      void loadAll();
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
      void loadAll();
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
      void loadAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete user";
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
      void loadAll();
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
      void loadAll();
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
      void loadAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete category";
      toast.error(message);
    }
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-[var(--font-serif)] text-2xl">Admin</CardTitle>
          <CardDescription>Manage users and categories.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Create, delete, and manage user roles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3 md:grid-cols-[1fr_160px_auto]" onSubmit={addUser}>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3}>Loading users...</TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>No users found.</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => void toggleUserRole(user)}>
                            Make {user.role === "admin" ? "User" : "Admin"}
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
      </div>
    </section>
  );
}
