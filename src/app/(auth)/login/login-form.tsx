"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowLeft, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { signIn, type LoginState } from "@/features/auth/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, undefined);

  return (
    <form action={action} className="mt-8 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">אימייל</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email" name="email" type="email" dir="ltr" autoComplete="username" required autoFocus
            defaultValue={state?.email} placeholder="name@store.co.il" className="h-11 ps-10 text-start"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">סיסמה</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="password" name="password" type="password" dir="ltr" autoComplete="current-password" required className="h-11 ps-10 text-start" />
        </div>
      </div>

      {state?.error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <Button type="submit" size="lg" className="h-11 w-full text-base shadow-md shadow-primary/25" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "מתחבר..." : "התחברות"}
        {!pending && <ArrowLeft className="size-4" />}
      </Button>
    </form>
  );
}
