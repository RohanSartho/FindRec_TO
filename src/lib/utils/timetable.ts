export const DAY_LABELS: Record<string, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday",
  Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

export const DAY_ABBRS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getTodayAbbr(): string {
  const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return map[new Date().getDay()];
}

export function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatAgeRange(minMonths: number | null, maxMonths: number | null): string {
  if (!minMonths && !maxMonths) return "All ages";
  const minYears = minMonths ? Math.floor(minMonths / 12) : null;
  const maxYears = maxMonths ? Math.floor(maxMonths / 12) : null;
  if (minYears && maxYears) return `${minYears}–${maxYears} yrs`;
  if (minYears) return `${minYears}+ yrs`;
  if (maxYears) return `Up to ${maxYears} yrs`;
  return "All ages";
}

export function compactTitle(title: string): string {
  if (!title) return "";
  return title
    .replace(/\s*-\s*Drop[- ]?In\s*/i, " – Drop-In ")
    .replace(/\s*Drop[- ]?In\s*/i, "Drop-In ")
    .replace(/\(All Ages\)/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function activityTypeColor(type: string): string {
  const map: Record<string, string> = {
    skating: "bg-brand/10 text-brand",
    fitness: "bg-orange-50 text-orange-700",
    aquatics: "bg-cyan-50 text-cyan-700",
    arts: "bg-purple-50 text-purple-700",
    sports: "bg-green-50 text-green-700",
    other: "bg-gray-50 text-gray-600",
  };
  return map[type] ?? map.other;
}
