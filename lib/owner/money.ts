/** Parse a dollar amount typed by a user ("1,234.5", "$12") into integer cents; null if invalid. */
export function dollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

/** Integer cents → "123.45" for an input field (no currency symbol). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
