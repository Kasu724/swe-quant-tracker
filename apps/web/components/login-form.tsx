"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button, Card, CardContent, Input } from "@faang-quant/ui";

export function LoginForm({ callbackUrl = "/saved-searches" }: { callbackUrl?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="max-w-md">
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const email = String(formData.get("email") ?? "");
            const password = String(formData.get("password") ?? "");

            startTransition(async () => {
              const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
                callbackUrl
              });

              if (result?.error) {
                setError("Invalid credentials or email not verified.");
                return;
              }

              window.location.href = callbackUrl;
            });
          }}
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
              Sign In
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
              Access saved searches and alerts
            </h1>
          </div>
          <Input name="email" type="email" placeholder="Email address" required />
          <Input name="password" type="password" placeholder="Password" required />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

