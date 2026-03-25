"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { processBulkMemberImport } from "@/lib/bulk-member-import";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export type BulkImportFormState =
  | null
  | {
      ok: true;
      results: Awaited<ReturnType<typeof processBulkMemberImport>>;
    }
  | { ok: false; error: string };

export async function bulkImportMembersAction(
  _prev: BulkImportFormState,
  formData: FormData,
): Promise<BulkImportFormState> {
  const session = await auth();
  if (!session?.user?.gymId) {
    return { ok: false, error: "Not signed in." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose a CSV file to upload." };
  }

  if (file.size === 0) {
    return { ok: false, error: "The file is empty." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File is too large (max 2 MB)." };
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv")) {
    return { ok: false, error: "Upload a .csv file (save Excel as CSV UTF-8 if needed)." };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "Could not read the file." };
  }

  const results = await processBulkMemberImport(session.user.gymId, text);
  if (results.some((r) => r.ok)) {
    revalidatePath("/members");
  }

  return { ok: true, results };
}
