"use server";

import { signIn, signOut } from "@/auth";
import { CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { registerOwner } from "@/lib/register-owner";

export type AuthFormState = { error?: string } | null;

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof CredentialsSignin) {
      return { error: "Invalid email or password" };
    }
    throw e;
  }

  redirect("/dashboard");
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const gymName = String(formData.get("gymName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim() || undefined;

  if (!email || !password || !gymName) {
    return { error: "Email, password, and gym name are required" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const result = await registerOwner({ email, password, gymName, ownerName });
  if (!result.ok) {
    return { error: result.error };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof CredentialsSignin) {
      return { error: "Account created but sign-in failed. Try logging in." };
    }
    throw e;
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
