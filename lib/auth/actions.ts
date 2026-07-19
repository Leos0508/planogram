"use server";

import { hash } from "bcryptjs";
import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-shared";
import { prisma } from "@/lib/prisma";
import { createWorkspaceForUser } from "@/lib/workspaces/bootstrap";
import { writeActiveWorkspaceCookie } from "@/lib/workspaces/cookie";

export type AuthActionState = {
  error?: string;
  /** Preserved across failed submissions (PLA-69). */
  email?: string;
  name?: string;
};

function normalizeEmail(email: FormDataEntryValue | null) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function normalizePassword(password: FormDataEntryValue | null) {
  return typeof password === "string" ? password : "";
}

function normalizeName(name: FormDataEntryValue | null) {
  const value = typeof name === "string" ? name.trim() : "";
  return value.length > 0 ? value : null;
}

/** Same-origin relative path only (blocks open redirects). */
function safeRedirectPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/planograms";
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/planograms";
  return path;
}

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(formData.get("email"));
  const password = normalizePassword(formData.get("password"));
  const redirectTo = safeRedirectPath(formData.get("callbackUrl"));

  if (!email || !password) {
    return { error: "Email and password are required.", email };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    // Successful sign-in throws a Next.js redirect — must rethrow.
    // Only map credential failures; other AuthErrors should not look like bad passwords.
    if (error instanceof CredentialsSignin) {
      return { error: "Invalid email or password.", email };
    }
    if (error instanceof AuthError) {
      console.error("[login] AuthError", error.type, error);
      return { error: "Sign-in failed. Try again.", email };
    }
    throw error;
  }

  return {};
}

export async function register(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(formData.get("email"));
  const password = normalizePassword(formData.get("password"));
  const name = normalizeName(formData.get("name"));
  const redirectTo = safeRedirectPath(formData.get("callbackUrl"));
  const preserved = { email, name: name ?? undefined };

  if (!email || !password) {
    return { error: "Email and password are required.", ...preserved };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      ...preserved,
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      error: "An account with this email already exists.",
      ...preserved,
    };
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
    },
  });

  const workspace = await createWorkspaceForUser(prisma, {
    userId: user.id,
    name: user.name,
    email: user.email,
  });

  await writeActiveWorkspaceCookie(workspace.id);

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Account created but sign-in failed. Try logging in.",
        ...preserved,
      };
    }
    throw error;
  }

  return {};
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** After password change: clear cookie and send user to login. */
export async function signOutToLoginAction() {
  await signOut({ redirectTo: "/login" });
}
