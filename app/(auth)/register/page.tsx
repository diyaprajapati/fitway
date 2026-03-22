import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Create your gym</h1>
        <p className="mt-1 text-muted-foreground">One account per gym. You&apos;ll be the owner.</p>
      </div>
      <RegisterForm />
    </div>
  );
}
