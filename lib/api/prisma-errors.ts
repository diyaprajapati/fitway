import { Prisma } from "@/generated/prisma/client";

export function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/** Prisma P2002 `meta.target` lists the field name(s) that hit the unique constraint. */
export function uniqueViolationMessage(e: Prisma.PrismaClientKnownRequestError): string {
  const target = e.meta?.target;
  const fields = Array.isArray(target) ? target : typeof target === "string" ? [target] : [];
  if (fields.includes("email")) {
    return "This email is already used by another member";
  }
  if (fields.includes("phone")) {
    return "This phone number is already used by another member";
  }
  return "This value must be unique (email and phone cannot repeat across members)";
}
