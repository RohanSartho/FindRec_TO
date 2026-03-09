"use client";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "flat";
}

/** Single KPI metric tile for the admin dashboard. */
export function KpiCard({ label, value, sub, trend }: KpiCardProps) {
  const trendColor =
    trend === "up"   ? "text-green-600" :
    trend === "down" ? "text-red-500"   : "text-gray-400";
  const trendArrow =
    trend === "up" ? "↑" : trend === "down" ? "↓" : "";

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
      <p
        className="text-3xl font-bold leading-none"
        style={{ color: "#1a3a2a", fontFamily: "var(--font-fraunces), serif" }}
      >
        {value}
      </p>
      {sub && (
        <p className={`text-xs mt-1 ${trendColor}`}>
          {trendArrow && <span className="mr-0.5">{trendArrow}</span>}
          {sub}
        </p>
      )}
    </div>
  );
}
