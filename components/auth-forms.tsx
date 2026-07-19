"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login, register, type AuthActionState } from "@/lib/auth/actions";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

function AuthError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

function useSafeCallbackUrl() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("callbackUrl");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const callbackUrl = useSafeCallbackUrl();
  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>
      <AuthError message={state.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-sm text-muted-foreground">
        No account?{" "}
        <Link
          href={registerHref}
          className="text-foreground underline-offset-4 hover:underline"
        >
          Register
        </Link>
      </p>
      <p className="text-xs text-muted-foreground">
        By signing in you agree to our{" "}
        <Link
          href="/terms"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState);
  const callbackUrl = useSafeCallbackUrl();
  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <AuthError message={state.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
      <p className="text-xs text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link
          href="/terms"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
