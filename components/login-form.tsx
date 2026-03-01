"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/client-api";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await apiJson<{ user: { username: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username })
      });
      toast.success("Welcome back");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to login";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-white/60 bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-[var(--font-serif)] text-2xl">Expense Logger</CardTitle>
        <CardDescription>Use your existing username to access your dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="e.g. elias"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>
          <Button className="w-full" disabled={loading || username.trim().length === 0} type="submit">
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
