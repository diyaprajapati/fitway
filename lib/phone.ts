/** Strip to digits; require typical international/local length (10–15 digits). */
export function normalizePhoneDigits(input: string): string | null {
  const digits = input.trim().replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function isValidPhoneFormat(input: string): boolean {
  return normalizePhoneDigits(input) !== null;
}
