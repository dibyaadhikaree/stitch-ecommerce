"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/admin/primitives";

export function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.token, data.admin);
      setError("");
      router.push("/dashboard");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-10 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(177,139,87,0.2),transparent_24%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(211,178,125,0.16),transparent_24%)]" />
      <div className="mx-auto flex max-w-6xl items-center justify-end">
        <ThemeToggle />
      </div>
      <div className="mx-auto mt-10 grid max-w-6xl gap-10 lg:grid-cols-[1fr_480px] lg:items-center">
        <section className="space-y-6">
          <Badge variant="soft" className="w-fit">
            Admin only experience
          </Badge>
          <h1 className="font-display text-5xl leading-[0.94] tracking-tight sm:text-6xl">
            STITCH Studio operations, inventory, orders, catalog, images, and
            analytics in one panel.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            This version is focused purely on the admin layer. The workflow is
            built so you restock existing products through inventory movement
            instead of creating duplicate products every time new stock arrives.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "Products remain permanent records while variants carry SKU, stock, and sold counts.",
              "Stock-in should happen against an existing variant whenever the design is the same.",
              "Orders, returns, and cancellations can now affect stock lifecycle more safely.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[28px] border border-border/70 bg-card/70 p-5 text-sm leading-7 text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <Card className="rounded-[34px] border-border/80 bg-card/92">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-foreground p-3 text-background">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-3xl">Admin Login</CardTitle>
                <CardDescription>
                  Use the credentials from your configured backend environment.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Email">
              <Input
                value={form.email}
                onChange={(e) =>
                  setForm((c) => ({ ...c, email: e.target.value }))
                }
                placeholder="admin@stitchstudio.com"
              />
            </FormField>
            <FormField label="Password">
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((c) => ({ ...c, password: e.target.value }))
                }
                placeholder="Your admin password"
              />
            </FormField>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <Button
              className="w-full"
              onClick={() => loginMutation.mutate(form)}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Enter admin panel"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
