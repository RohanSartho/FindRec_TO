"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Minus, Plus } from "lucide-react";
import {
  getTodayISO,
  formatTimeRange, formatAgeRange, compactTitle, activityTypeColor,
} from "@/lib/utils/timetable";
import { SUB_ACTIVITY_MAP } from "@/lib/config/dropinFilters";
import clsx from "clsx";

type View = "day" | "week" | "calendar";
type SportFilter = "skating" | "aquatics" | "fitness" | "arts" | "sports" | "all";

const SPORT_OPTIONS: { value: SportFilter; label: string }[] = [
  { value: "all",      label: "All" },
  { value: "skating",  label: "Skating" },
  { value: "aquatics", label: "Aquatics" },
  { value: "fitness",  label: "Fitness" },
  { value: "arts",     label: "Arts" },
  { value: "sports",   label: "Sports" },
];

const CATEGORY_ORDER = ["aquatics", "skating", "fitness", "arts", "sports"];

interface DropIn {
  course_id: number;
  course_title: string;
  section: string;
  day_of_week: string;
  first_date: string;
  last_date: string;
  start_time: string;
  end_time: string;
  min_age_months: number | null;
  max_age_months: number | null;
  activity_type: string;
  sub_activity: string | null;
}

interface Program {
  course_id: number;
  activity_title: string;
  course_title: string;
  days_of_week: string[];
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  min_age_months: number | null;
  max_age_months: number | null;
  activity_type: string;
  sub_activity: string | null;
  status: string | null;
  activity_url: string | null;
  program_category: string | null;
}

function matchesSport(activityType: string, filter: SportFilter): boolean {
  if (filter === "all") return true;
  return activityType?.toLowerCase() === filter;
}

function getMondayISO(date: string): string {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function sortedCats(map: Record<string, unknown[]>): string[] {
  return Object.keys(map).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function Timetable({
  assetId,
  locationId,
  rinkType,
  defaultSportFilter = "skating",
  defaultShowPrograms = false,
}: {
  assetId?: number;
  locationId?: number;
  rinkType?: string;
  defaultSportFilter?: SportFilter;
  defaultShowPrograms?: boolean;
}) {
  const [view, setView] = useState<View>("day");
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [sportFilter, setSportFilter] = useState<SportFilter>(defaultSportFilter);
  const [subFilter, setSubFilter] = useState("");
  const [dropins, setDropins] = useState<DropIn[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropins, setShowDropins] = useState(true);
  const [showPrograms, setShowPrograms] = useState(defaultShowPrograms);
  const [calCollapsed, setCalCollapsed] = useState<Set<string>>(new Set());

  const apiView = view === "calendar" ? "week" : view;

  useEffect(() => {
    const apiUrl =
      assetId !== undefined
        ? `/api/rinks/${assetId}/programs?view=${apiView}&date=${selectedDate}`
        : `/api/locations/${locationId}/programs?view=${apiView}&date=${selectedDate}`;

    setLoading(true);
    setError(null);
    fetch(apiUrl)
      .then((r) => r.json())
      .then((json) => {
        setDropins(json.data?.dropins ?? []);
        setPrograms(json.data?.programs ?? []);
      })
      .catch(() => setError("Failed to load schedule."))
      .finally(() => setLoading(false));
  }, [assetId, locationId, apiView, selectedDate]);

  const filteredDropins = dropins
    .filter((d) => matchesSport(d.activity_type, sportFilter))
    .filter((d) => !subFilter || d.sub_activity === subFilter);
  const filteredPrograms = programs
    .filter((p) => matchesSport(p.activity_type, sportFilter))
    .filter((p) => !subFilter || p.sub_activity === subFilter);

  const subOptions = sportFilter !== "all" ? (SUB_ACTIVITY_MAP[sportFilter] ?? []) : [];

  // Week list: date → items
  const dropinsByDate = useMemo(() => {
    return filteredDropins.reduce((acc, d) => {
      const date = d.first_date ?? d.day_of_week ?? "unknown";
      if (!acc[date]) acc[date] = [];
      acc[date].push(d);
      return acc;
    }, {} as Record<string, DropIn[]>);
  }, [filteredDropins]);
  const sortedDateKeys = useMemo(() => Object.keys(dropinsByDate).sort(), [dropinsByDate]);

  // Day view: category → items
  const dropinsByCategory = useMemo(() => {
    return filteredDropins.reduce((acc, d) => {
      const cat = d.activity_type || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(d);
      return acc;
    }, {} as Record<string, DropIn[]>);
  }, [filteredDropins]);

  // Calendar grid
  const weekStart = getMondayISO(selectedDate);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftDate(weekStart, i)),
    [weekStart]
  );

  interface CalRow { title: string; ageLabel: string; slots: Record<string, string[]> }
  const calendarGroups = useMemo((): Record<string, CalRow[]> => {
    if (view !== "calendar") return {};
    const groups: Record<string, CalRow[]> = {};
    for (const d of filteredDropins) {
      const title = compactTitle(d.course_title);
      const age = formatAgeRange(d.min_age_months, d.max_age_months);
      const cat = d.activity_type || "other";
      if (!groups[cat]) groups[cat] = [];
      let row = groups[cat].find((r) => r.title === title && r.ageLabel === age);
      if (!row) { row = { title, ageLabel: age, slots: {} }; groups[cat].push(row); }
      const date = d.first_date;
      if (date && weekDays.includes(date)) {
        if (!row.slots[date]) row.slots[date] = [];
        row.slots[date].push(formatTimeRange(d.start_time, d.end_time));
      }
    }
    return groups;
  }, [filteredDropins, view, weekDays]);

  const today = getTodayISO();

  const toggleCalCollapsed = (cat: string) =>
    setCalCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });

  const weekLabel = new Date(weekStart + "T00:00:00").toLocaleDateString("en-CA", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-4">

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-gray-100 rounded-xl overflow-hidden">
          {([
            { v: "day",      label: "Today"    },
            { v: "week",     label: "Week"      },
            { v: "calendar", label: "Calendar"  },
          ] as { v: View; label: string }[]).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium transition ${
                view === v ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "day" && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        )}

        {(view === "week" || view === "calendar") && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, -7))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:border-brand hover:text-brand transition"
            >
              ‹ Prev
            </button>
            <span className="text-sm text-gray-600 font-medium">
              {new Date(weekStart + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
              {" – "}
              {new Date(shiftDate(weekStart, 6) + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
            </span>
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, 7))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:border-brand hover:text-brand transition"
            >
              Next ›
            </button>
          </div>
        )}

        <div className="relative">
          <select
            value={sportFilter}
            onChange={(e) => { setSportFilter(e.target.value as SportFilter); setSubFilter(""); }}
            className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
          >
            {SPORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {subOptions.length > 0 && (
          <div className="relative">
            <select
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
            >
              <option value="">All {SPORT_OPTIONS.find(o => o.value === sportFilter)?.label}</option>
              {subOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          {/* Drop-ins */}
          <div>
            <button
              onClick={() => setShowDropins(!showDropins)}
              className="flex items-center justify-between w-full text-left px-4 py-3 rounded-xl"
              style={{ backgroundColor: "#1a3a2a" }}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base font-bold text-white" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                  Drop-In Schedule
                </span>
                {filteredDropins.length > 0 && (
                  <span className="text-xs font-medium bg-white/15 text-white px-2 py-0.5 rounded-full">
                    {filteredDropins.length} sessions
                  </span>
                )}
              </span>
              {showDropins
                ? <ChevronUp size={16} className="text-white/70 shrink-0" />
                : <ChevronDown size={16} className="text-white/70 shrink-0" />
              }
            </button>

            {showDropins && (
              <div className="mt-3">

                {/* ── CALENDAR ─────────────────────────────────────────────── */}
                {view === "calendar" ? (
                  Object.keys(calendarGroups).length === 0 ? (
                    <EmptyState message="No drop-in sessions this week." />
                  ) : (
                    <div>
                      <p className="text-xs text-gray-500 mb-3">
                        Week of <span className="font-medium text-gray-700">{weekLabel}</span>
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full border-collapse text-sm min-w-[600px]">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left py-2.5 px-3 font-semibold text-gray-700 w-36 border-b border-gray-200">
                                Program
                              </th>
                              {weekDays.map((day) => {
                                const isToday = day === today;
                                const dateObj = new Date(day + "T00:00:00");
                                return (
                                  <th
                                    key={day}
                                    className={clsx(
                                      "py-2.5 px-2 text-center border-b min-w-[72px]",
                                      isToday
                                        ? "border-b-2 border-b-brand text-brand bg-brand/5"
                                        : "border-gray-200 text-gray-600"
                                    )}
                                  >
                                    <div className="font-semibold text-xs">
                                      {dateObj.toLocaleDateString("en-US", { weekday: "short" })}
                                    </div>
                                    <div className="text-xs font-normal">
                                      {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {sortedCats(calendarGroups).flatMap((cat) => {
                              const rows = calendarGroups[cat];
                              const collapsed = calCollapsed.has(cat);
                              return [
                                <tr key={`hdr-${cat}`}>
                                  <td colSpan={8} style={{ backgroundColor: "#1a3a2a" }} className="py-2 px-3">
                                    <button
                                      onClick={() => toggleCalCollapsed(cat)}
                                      className="flex items-center gap-2 text-white font-semibold text-sm w-full text-left"
                                    >
                                      {collapsed
                                        ? <Plus size={13} className="shrink-0" />
                                        : <Minus size={13} className="shrink-0" />
                                      }
                                      {cap(cat)}
                                    </button>
                                  </td>
                                </tr>,
                                ...(!collapsed ? rows.map((row, ri) => (
                                  <tr
                                    key={`${cat}-${ri}`}
                                    className={clsx(
                                      "border-b border-gray-100",
                                      ri % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                                    )}
                                  >
                                    <td className="py-2.5 px-3 align-top">
                                      <div className="font-medium text-gray-900 text-sm leading-tight">{row.title}</div>
                                      <div className="text-xs text-gray-500 mt-0.5">{row.ageLabel}</div>
                                    </td>
                                    {weekDays.map((day) => {
                                      const isToday = day === today;
                                      const slots = row.slots[day] ?? [];
                                      return (
                                        <td
                                          key={day}
                                          className={clsx(
                                            "py-2 px-1 align-top text-center",
                                            isToday && "bg-brand/5"
                                          )}
                                        >
                                          {slots.map((s, si) => (
                                            <div key={si} className="text-xs text-gray-700 leading-snug whitespace-nowrap">
                                              {s}
                                            </div>
                                          ))}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                )) : []),
                              ];
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )

                /* ── WEEK LIST ──────────────────────────────────────────── */
                ) : view === "week" ? (
                  <div className="space-y-6">
                    {sortedDateKeys.length === 0 ? (
                      <EmptyState message="No drop-in sessions this week." />
                    ) : (
                      sortedDateKeys.map((date) => {
                        const items = dropinsByDate[date];
                        const isToday = date === today;
                        const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-CA", {
                          weekday: "long", month: "short", day: "numeric",
                        });

                        const dayByCat: Record<string, DropIn[]> = {};
                        for (const item of items) {
                          const cat = item.activity_type || "other";
                          if (!dayByCat[cat]) dayByCat[cat] = [];
                          dayByCat[cat].push(item);
                        }

                        return (
                          <div key={date}>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-base text-gray-900">{dateLabel}</h3>
                              {isToday && (
                                <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className={clsx("h-px mb-3", isToday ? "bg-brand/40" : "bg-gray-100")} />
                            <div className="space-y-3">
                              {sortedCats(dayByCat).map((cat) => (
                                <div key={cat}>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                    {cap(cat)}
                                  </p>
                                  <div className="space-y-2">
                                    {dayByCat[cat].map((d) => (
                                      <DropInRow key={`${d.course_id}-${date}`} dropin={d} isOutdoor={rinkType === "outdoor"} hideChip />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                /* ── DAY LIST ───────────────────────────────────────────── */
                ) : (
                  <div className="space-y-3">
                    {filteredDropins.length === 0 ? (
                      <EmptyState message="No drop-in sessions for this day." />
                    ) : (
                      sortedCats(dropinsByCategory).map((cat) => (
                        <div key={cat}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                            {cap(cat)}
                          </p>
                          <div className="space-y-2">
                            {dropinsByCategory[cat].map((d) => (
                              <DropInRow
                                key={`${d.course_id}-${d.day_of_week}`}
                                dropin={d}
                                isOutdoor={rinkType === "outdoor"}
                                hideChip
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Registered programs */}
          <div>
            <button
              onClick={() => setShowPrograms(!showPrograms)}
              className="flex items-center justify-between w-full text-left px-4 py-3 rounded-xl"
              style={{ backgroundColor: "#1a3a2a" }}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base font-bold text-white" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                  Registered Programs
                </span>
                {filteredPrograms.length > 0 && (
                  <span className="text-xs font-medium bg-white/15 text-white px-2 py-0.5 rounded-full">
                    {filteredPrograms.length} available
                  </span>
                )}
              </span>
              {showPrograms
                ? <ChevronUp size={16} className="text-white/70 shrink-0" />
                : <ChevronDown size={16} className="text-white/70 shrink-0" />
              }
            </button>

            {showPrograms && (
              <div className="mt-3 space-y-2">
                {filteredPrograms.length === 0 ? (
                  <EmptyState message="No registered programs for this period." />
                ) : (
                  filteredPrograms.map((p) => (
                    <ProgramRow key={p.course_id} program={p} />
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DropInRow({
  dropin, isOutdoor, hideChip = false,
}: { dropin: DropIn; isOutdoor?: boolean; hideChip?: boolean }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-medium text-gray-900 truncate">
            {compactTitle(dropin.course_title)}
          </span>
          {!hideChip && (
            <span className={`text-sm px-1.5 py-0.5 rounded-full shrink-0 ${activityTypeColor(dropin.activity_type)}`}>
              {dropin.activity_type}
            </span>
          )}
          {isOutdoor && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
              Free
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-0.5">
          {formatAgeRange(dropin.min_age_months, dropin.max_age_months)}
        </p>
      </div>
      <div className="text-sm font-medium text-gray-700 shrink-0 text-right">
        {formatTimeRange(dropin.start_time, dropin.end_time)}
      </div>
    </div>
  );
}

function ProgramRow({ program }: { program: Program }) {
  return (
    <div className="flex items-start justify-between bg-brand/5 rounded-xl px-3 py-2.5 gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-medium text-gray-900 truncate">
            {compactTitle(program.activity_title || program.course_title)}
          </span>
          {program.program_category && (
            <span className={`text-sm px-1.5 py-0.5 rounded-full shrink-0 ${activityTypeColor(program.activity_type)}`}>
              {program.program_category}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-0.5">
          {program.days_of_week?.join(", ")} · {formatAgeRange(program.min_age_months, program.max_age_months)}
        </p>
        {program.status && (
          <p className="text-sm text-gray-500 mt-0.5 italic">{program.status}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-sm font-medium text-gray-700">
          {formatTimeRange(program.start_time, program.end_time)}
        </span>
        {program.activity_url && (
          <a
            href={program.activity_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand hover:underline flex items-center gap-1"
          >
            Register <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-gray-500 py-4 text-center">{message}</p>;
}
