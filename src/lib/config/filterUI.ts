/** Shared helpers used by both DropInFilterPanel and ProgramsFilterPanel. */

export function filterBorder(touched: boolean): string {
  return touched
    ? "border-2 rounded-xl p-2"
    : "border-2 rounded-xl p-2 animate-filter-pulse";
}

export const BRAND_BORDER = { borderColor: "#1a3a2a" };
