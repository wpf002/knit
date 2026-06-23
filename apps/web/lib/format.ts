// Prices are stored as integer cents. Render them as dollars.
export function cents(value?: number | null): string {
  if (value == null) return "";
  return `$${(value / 100).toLocaleString("en-US", { minimumFractionDigits: value % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
