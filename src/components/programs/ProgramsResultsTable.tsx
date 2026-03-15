"use client";

import { useState, useEffect } from "react";
import { formatTimeRange, formatAgeRange } from "@/lib/utils/timetable";
import { MapPin, ExternalLink, ChevronDown, ChevronUp, ChevronsUpDown, Bookmark } from "lucide-react";
import Link from "next/link";
import React from "react";
import clsx from "clsx";
import posthog from "posthog-js";
import { ScrollHint } from "@/components/ui/ScrollHint";
import { AuthModal } from "@/components/ui/AuthModal";
import { useAuth } from "@/lib/hooks/useAuth";

interface Program {
  course_id: number | null;
  activity_title: string | null;
  course_title: string | null;
  days_of_week: string[] | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  min_age_months: number | null;
  max_age_months: number | null;
  activity_type: string | null;
  sub_activity: string | null;
  status: string | null;
  activity_url: string | null;
  location_id: number | null;
  locations: {
    name: string;
    address: string | null;
    district: string | null;
  } | null;
}

interface ProgramsResultsTableProps {
  programs: Program[];
  total: number;
  returnTo?: string;
  searchTrigger?: number;
}

// ── Status helpers ────────────────────────────────────────────────────────────

function parseStatus(status: string | null): "open" | "waitlist" | "full" | "started" | "cancelled" | "unknown" {
  if (!status) return "unknown";
  const lower = status.toLowerCase();
  if (lower.includes("cancel")) return "cancelled";
  if (lower.includes("wait")) return "waitlist";
  if (lower.includes("full")) return "full";
  if (lower.includes("started") || lower.includes("in progress")) return "started";
  if (lower.includes("open") || lower.includes("avail")) return "open";
  return "unknown";
}

const STATUS_PRIORITY: Record<ReturnType<typeof parseStatus>, number> = {
  open: 0,
  waitlist: 1,
  full: 2,
  started: 3,
  cancelled: 4,
  unknown: 5,
};

const STATUS_CONFIG: Partial<Record<ReturnType<typeof parseStatus>, { bg: string; text: string; dot: string; label: string }>> = {
  open:      { bg: "bg-green-50",  text: "text-green-800",  dot: "bg-green-500",  label: "Enroll now"     },
  waitlist:  { bg: "bg-yellow-50", text: "text-yellow-800", dot: "bg-yellow-400", label: "Waitlist"       },
  full:      { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500",    label: "Full"           },
  started:   { bg: "bg-amber-50",  text: "text-amber-800",  dot: "bg-amber-400",  label: "Course started" },
  cancelled: { bg: "bg-gray-100",  text: "text-gray-500",   dot: "bg-gray-400",   label: "Cancelled"      },
};

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[parseStatus(status)];
  if (!cfg) return <span className="text-xs text-gray-400">{status ?? "—"}</span>;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap", cfg.bg, cfg.text)}>
      <span className={clsx("w-2 h-2 rounded-sm shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "—";
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
    });
  if (!end || start === end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatDays(days: string[] | null): React.ReactNode {
  if (!days || days.length === 0) return "—";
  if (days.length >= 7) return "Daily";
  const line1 = days.slice(0, 2).join(", ");
  const line2 = days.slice(2).join(", ");
  return (
    <span>
      {line1}
      {line2 && <><br />{line2}</>}
    </span>
  );
}

const ACTIVITY_LABELS: Record<string, string> = {
  skating:  "Skating",
  fitness:  "Fitness",
  aquatics: "Aquatics",
  arts:     "Arts & Culture",
  sports:   "Sports",
  other:    "Other",
};

// ── Sort helpers ──────────────────────────────────────────────────────────────

type SortCol = "program" | "location" | "date";
type SortDir = "asc" | "desc";

function sortPrograms(progs: Program[], col: SortCol, dir: SortDir): Program[] {
  return [...progs].sort((a, b) => {
    let cmp = 0;
    if (col === "program") {
      const na = (a.activity_title ?? a.course_title ?? "").toLowerCase();
      const nb = (b.activity_title ?? b.course_title ?? "").toLowerCase();
      cmp = na.localeCompare(nb);
    } else if (col === "location") {
      const na = (a.locations?.name ?? "").toLowerCase();
      const nb = (b.locations?.name ?? "").toLowerCase();
      cmp = na.localeCompare(nb);
    } else {
      const da = a.start_date ?? "";
      const db = b.start_date ?? "";
      cmp = da < db ? -1 : da > db ? 1 : 0;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ── Program watchlist button ──────────────────────────────────────────────────
// Renders a bookmark icon per row. Tracks optimistic state locally; syncs
// with /api/program-watchlist on mount.

interface ProgramWatchlistButtonProps {
  courseId: number | null;
  locationId: number | null;
  /** Set of "courseId:locationId" keys already on this user's watchlist */
  watchedKeys: Set<string>;
  onToggle: (courseId: number, locationId: number, isAdding: boolean) => void;
  onRequireAuth: () => void;
}

function ProgramWatchlistButton({
  courseId,
  locationId,
  watchedKeys,
  onToggle,
  onRequireAuth,
}: ProgramWatchlistButtonProps) {
  const { user } = useAuth();
  if (!courseId || !locationId) return null;

  const key = `${courseId}:${locationId}`;
  const isWatched = watchedKeys.has(key);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { onRequireAuth(); return; }
    onToggle(courseId, locationId, !isWatched);
  };

  return (
    <button
      onClick={handleClick}
      title={isWatched ? "Remove from watchlist" : "Add to program watchlist"}
      className={clsx(
        "p-1 rounded-full transition",
        isWatched
          ? "text-brand hover:text-brand/70"
          : "text-gray-300 hover:text-brand"
      )}
    >
      <Bookmark size={13} className={isWatched ? "fill-brand" : ""} />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProgramsResultsTable({
  programs,
  total,
  returnTo,
  searchTrigger,
}: ProgramsResultsTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<SortCol>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Watched keys: "courseId:locationId" — synced from API on mount
  const [watchedKeys, setWatchedKeys] = useState<Set<string>>(new Set());
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    fetch("/api/program-watchlist")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then(({ data }) => {
        if (!Array.isArray(data)) return;
        setWatchedKeys(new Set(data.map((w: { course_id: number; location_id: number }) =>
          `${w.course_id}:${w.location_id}`
        )));
      })
      .catch(() => {/* unauthenticated — no watchlist to show */});
  }, []);

  const handleWatchlistToggle = async (courseId: number, locationId: number, isAdding: boolean) => {
    const key = `${courseId}:${locationId}`;
    // Optimistic update
    setWatchedKeys((prev) => {
      const next = new Set(prev);
      if (isAdding) next.add(key); else next.delete(key);
      return next;
    });

    if (isAdding) {
      const res = await fetch("/api/program-watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, location_id: locationId }),
      });
      if (!res.ok && res.status !== 409) {
        setWatchedKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
      }
    } else {
      // Find the watchlist entry id, then delete
      const listRes = await fetch("/api/program-watchlist");
      if (listRes.ok) {
        const { data } = await listRes.json();
        const match = data?.find((w: { id: number; course_id: number; location_id: number }) =>
          w.course_id === courseId && w.location_id === locationId
        );
        if (match) {
          await fetch("/api/program-watchlist", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: match.id }),
          });
        }
      }
    }
  };

  const handleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "date" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <ChevronsUpDown size={11} className="ml-1 text-gray-400 inline shrink-0" />;
    return sortDir === "asc"
      ? <ChevronUp size={11} className="ml-1 text-brand inline shrink-0" />
      : <ChevronDown size={11} className="ml-1 text-brand inline shrink-0" />;
  };

  if (programs.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium mb-1">No registered programs found</p>
        <p className="text-sm">Try a different date range, location, or activity type.</p>
      </div>
    );
  }

  // Group + sort within each group by status priority
  const groupOrder = ["skating", "aquatics", "fitness", "arts", "sports", "other"];
  const grouped = new Map<string, Program[]>();
  for (const prog of programs) {
    const key = prog.activity_type ?? "other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(prog);
  }
  // Sort groups by predefined order, then sort programs within each group
  const sortedGroups = [...grouped.entries()]
    .sort(([a], [b]) => {
      const ai = groupOrder.indexOf(a);
      const bi = groupOrder.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([key, progs]) => ({
      key,
      label: ACTIVITY_LABELS[key] ?? key,
      programs: sortPrograms(progs, sortCol, sortDir),
    }));

  const truncated = total >= 300;

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Sign in to add programs to your watchlist."
      />
      <ScrollHint triggerKey={searchTrigger} />
      {/* Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium text-gray-900">
          {total} program{total !== 1 ? "s" : ""} found
          {truncated && (
            <span className="ml-2 text-xs text-amber-600 font-normal">
              (showing first 300 — narrow filters for more specific results)
            </span>
          )}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setCollapsedGroups(new Set())}
            className={clsx("text-xs hover:underline", collapsedGroups.size > 0 ? "text-brand font-semibold" : "text-gray-400")}
          >
            Expand all
          </button>
          <button
            onClick={() => setCollapsedGroups(new Set(sortedGroups.map((g) => g.key)))}
            className={clsx("text-xs hover:underline", collapsedGroups.size === 0 ? "text-brand font-semibold" : "text-gray-400")}
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Groups */}
      {sortedGroups.map(({ key, label, programs: groupPrograms }) => {
        const isCollapsed = collapsedGroups.has(key);
        return (
          <div key={key} className="bg-white border-2 border-brand rounded-2xl overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(key)}
              className="w-full flex items-center justify-between px-5 py-4 bg-brand hover:bg-brand-dark transition text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">{label}</span>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {groupPrograms.length} program{groupPrograms.length !== 1 ? "s" : ""}
                </span>
              </div>
              {isCollapsed
                ? <ChevronDown size={16} className="text-gray-300 shrink-0" />
                : <ChevronUp size={16} className="text-gray-300 shrink-0" />}
            </button>

            {/* Table */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <button onClick={() => handleSort("program")} className="inline-flex items-center hover:text-brand transition">
                          Program<SortIcon col="program" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide hidden sm:table-cell w-[130px]">
                        <button onClick={() => handleSort("location")} className="inline-flex items-center hover:text-brand transition">
                          Location<SortIcon col="location" />
                        </button>
                      </th>
                      {/* Combined Days + Dates — mobile only (below md) */}
                      <th className="text-left px-2 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide md:hidden">
                        <button onClick={() => handleSort("date")} className="inline-flex items-center hover:text-brand transition">
                          Schedule<SortIcon col="date" />
                        </button>
                      </th>
                      {/* Separate Days — desktop only (md+) */}
                      <th className="text-left px-2 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell w-[64px]">
                        Days
                      </th>
                      {/* Separate Dates — desktop only (md+) */}
                      <th className="text-left px-2 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">
                        <button onClick={() => handleSort("date")} className="inline-flex items-center hover:text-brand transition">
                          Dates<SortIcon col="date" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Time
                      </th>
                      <th className="text-left px-2 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide hidden sm:table-cell">
                        Age
                      </th>
                      <th className="text-left px-2 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Status
                      </th>
                      {/* Watchlist column — icon only, no label */}
                      <th className="px-3 py-2.5 w-8" aria-label="Watchlist" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {groupPrograms.map((prog, idx) => {
                      const name = prog.activity_title ?? prog.course_title ?? "Unknown Program";
                      const venueHref = prog.location_id
                        ? `/venues/${prog.location_id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
                        : null;

                      return (
                        <tr key={`${prog.course_id}-${idx}`} className="hover:bg-brand/5 transition">
                          {/* Program name */}
                          <td className="px-5 py-3">
                            {prog.activity_url ? (
                              <a
                                href={prog.activity_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-gray-900 hover:text-brand transition leading-tight inline-flex items-center gap-1"
                              >
                                {name}
                                <ExternalLink size={11} className="text-gray-400 shrink-0" />
                              </a>
                            ) : (
                              <span className="font-medium text-gray-900 leading-tight block">{name}</span>
                            )}
                            <span className="text-xs text-gray-400 sm:hidden">{prog.locations?.name ?? ""}</span>
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3 hidden sm:table-cell w-[130px]">
                            {venueHref ? (
                              <Link
                                href={venueHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-900 hover:text-brand transition leading-snug block"
                                onClick={() => posthog.capture("programs_result_venue_click", {
                                  location_id:   prog.location_id,
                                  location_name: prog.locations?.name ?? null,
                                  activity_type: prog.activity_type,
                                  sub_activity:  prog.sub_activity,
                                })}
                              >
                                {prog.locations?.name ?? "—"}
                              </Link>
                            ) : (
                              <span className="text-sm text-gray-700 leading-snug block">
                                {prog.locations?.name ?? "—"}
                              </span>
                            )}
                            {prog.locations?.address && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className="shrink-0 text-gray-300" />
                                <span className="text-xs text-gray-400 truncate max-w-[110px]">
                                  {prog.locations.address}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Combined Days + Dates — mobile only (below md) */}
                          <td className="px-2 py-3 md:hidden">
                            <span className="text-xs text-gray-600 leading-snug block">{formatDays(prog.days_of_week)}</span>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateRange(prog.start_date, prog.end_date)}</span>
                          </td>

                          {/* Days — desktop only (md+) */}
                          <td className="px-2 py-3 hidden md:table-cell w-[64px]">
                            <span className="text-xs text-gray-600 leading-snug">{formatDays(prog.days_of_week)}</span>
                          </td>

                          {/* Date range — desktop only (md+) */}
                          <td className="px-2 py-3 hidden md:table-cell">
                            <span className="text-xs text-gray-600 whitespace-nowrap">
                              {formatDateRange(prog.start_date, prog.end_date)}
                            </span>
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900 whitespace-nowrap">
                              {formatTimeRange(prog.start_time, prog.end_time)}
                            </span>
                          </td>

                          {/* Age */}
                          <td className="px-2 py-3 hidden sm:table-cell">
                            <span className="text-xs text-gray-600">
                              {formatAgeRange(prog.min_age_months, prog.max_age_months)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-2 py-3">
                            <StatusBadge status={prog.status} />
                          </td>
                          {/* Watchlist button */}
                          <td className="px-3 py-3">
                            <ProgramWatchlistButton
                              courseId={prog.course_id}
                              locationId={prog.location_id}
                              watchedKeys={watchedKeys}
                              onToggle={handleWatchlistToggle}
                              onRequireAuth={() => setShowAuthModal(true)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
