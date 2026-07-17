"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createWorkspaceForUser } from "@/lib/workspaces/bootstrap";
import { writeActiveWorkspaceCookie } from "@/lib/workspaces/cookie";

const MIN_PASSWORD_LENGTH = 8;

export type AuthActionState = {
  error?: string;
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
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
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

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
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
      return { error: "Account created but sign-in failed. Try logging in." };
    }
    throw error;
  }

  return {};
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
