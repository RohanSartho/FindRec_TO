"use client";

import { formatTimeRange, formatAgeRange } from "@/lib/utils/timetable";
import { MapPin, ChevronDown, ChevronUp, Bell } from "lucide-react";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import posthog from "posthog-js";
import { ScrollHint } from "@/components/ui/ScrollHint";
import { AuthModal } from "@/components/ui/AuthModal";
import { useAuth } from "@/lib/hooks/useAuth";
import { User } from "@supabase/supabase-js";

interface Session {
  course_id: number;
  course_title: string;
  activity_type: string | null;
  start_time: string;
  end_time: string;
  min_age_months: number | null;
  max_age_months: number | null;
  location_id: number;
  locations: {
    name: string;
    address: string | null;
    district: string | null;
    rinks?: Array<{ asset_id: number; rink_type?: string }>;
  } | null;
}

function VenueTypeBadge({ session }: { session: Session }) {
  const rinkType = session.locations?.rinks?.[0]?.rink_type;
  if (rinkType === "outdoor") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Outdoor
      </span>
    );
  }
  if (rinkType === "indoor") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        Indoor
      </span>
    );
  }
  // Non-skating activities (aquatics, fitness, etc.) are always indoor
  if (session.activity_type && session.activity_type !== "skating") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        Indoor
      </span>
    );
  }
  return <span className="text-gray-400 text-xs">—</span>;
}

type SortCol = "location" | "venue_type" | "time";
type SortDir = "asc" | "desc";

function getVenueTypeRank(session: Session): number {
  const rinkType = session.locations?.rinks?.[0]?.rink_type;
  if (rinkType === "indoor") return 0;
  if (rinkType === "outdoor") return 1;
  if (session.activity_type && session.activity_type !== "skating") return 0;
  return 2;
}

function sortSessions(sessions: Session[], col: SortCol, dir: SortDir): Session[] {
  const sorted = [...sessions].sort((a, b) => {
    let cmp = 0;
    if (col === "location") {
      cmp = (a.locations?.name ?? "").localeCompare(b.locations?.name ?? "");
    } else if (col === "venue_type") {
      cmp = getVenueTypeRank(a) - getVenueTypeRank(b);
    } else if (col === "time") {
      cmp = (a.start_time ?? "").localeCompare(b.start_time ?? "");
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

interface Group {
  program_type: string;
  session_count: number;
  sessions: Session[];
}

// ── Drop-in alert button ──────────────────────────────────────────────────────
// Renders a bell icon per row. Tracks optimistic state locally; syncs with
// /api/dropin-alerts on mount to reflect any alerts the user already set.
// Key format: "locationId:courseTitle:startTime:endTime" — time-specific.

interface DropInAlertButtonProps {
  locationId:  number;
  courseTitle: string;
  startTime:   string;
  endTime:     string;
  /** Set of "locationId:courseTitle:startTime:endTime" keys already tracked */
  trackedKeys: Set<string>;
  user: User | null;
  onToggle: (locationId: number, courseTitle: string, startTime: string, endTime: string, isAdding: boolean) => void;
  onRequireAuth: () => void;
}

function DropInAlertButton({
  locationId,
  courseTitle,
  startTime,
  endTime,
  trackedKeys,
  user,
  onToggle,
  onRequireAuth,
}: DropInAlertButtonProps) {
  const key = `${locationId}:${courseTitle}:${startTime}:${endTime}`;
  const isTracked = trackedKeys.has(key);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { onRequireAuth(); return; }
    onToggle(locationId, courseTitle, startTime, endTime, !isTracked);
  };

  return (
    // Tooltip wrapper — shows instantly on hover (no browser title delay)
    <div className="relative group/bell inline-flex">
      <button
        onClick={handleClick}
        className={clsx(
          "p-1.5 rounded-full transition",
          isTracked
            ? "text-brand hover:text-brand/70"
            : "text-gray-300 hover:text-brand animate-pulse"
        )}
      >
        <Bell size={18} className={isTracked ? "fill-brand" : ""} />
      </button>
      {/* Instant tooltip — no delay via duration-0 */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[11px] font-medium bg-gray-800 text-white rounded-md whitespace-nowrap opacity-0 group-hover/bell:opacity-100 pointer-events-none transition-opacity duration-0 z-50">
        {isTracked ? "Remove alert" : "Alert me for this time slot"}
        {/* Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </div>
    </div>
  );
}

interface DropInResultsTableProps {
  groups: Group[];
  total: number;
  date: string;
  returnTo?: string;
  searchTrigger?: number;
}

export function DropInResultsTable({
  groups,
  total,
  date,
  returnTo,
  searchTrigger,
}: DropInResultsTableProps) {
  const { user } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<SortCol>("time");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Tracked alert keys — re-fetched whenever auth state changes (sign in / sign out)
  const [trackedKeys, setTrackedKeys] = useState<Set<string>>(new Set());
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Clear immediately when signed out so stale bells don't persist
    if (!user) { setTrackedKeys(new Set()); return; }

    fetch("/api/dropin-alerts")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then(({ data }) => {
        if (!Array.isArray(data)) return;
        // Key includes time slot so each specific time slot is tracked independently
        setTrackedKeys(new Set(data.map((a: {
          location_id: number; course_title: string;
          alert_start_time: string; alert_end_time: string;
        }) => `${a.location_id}:${a.course_title}:${a.alert_start_time}:${a.alert_end_time}`)));
      })
      .catch(() => {});
  }, [user]); // re-run on sign in / sign out

  const handleAlertToggle = async (
    locationId: number, courseTitle: string,
    startTime: string, endTime: string,
    isAdding: boolean,
  ) => {
    const key = `${locationId}:${courseTitle}:${startTime}:${endTime}`;
    // Optimistic update
    setTrackedKeys((prev) => {
      const next = new Set(prev);
      if (isAdding) next.add(key); else next.delete(key);
      return next;
    });

    if (isAdding) {
      const res = await fetch("/api/dropin-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          course_title: courseTitle,
          start_time: startTime,
          end_time: endTime,
        }),
      });
      // Roll back on failure (excluding 409 duplicate — keep as tracked)
      if (!res.ok && res.status !== 409) {
        setTrackedKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
      }
    } else {
      // Re-fetch to find the specific alert id matching this (venue + activity + time)
      const listRes = await fetch("/api/dropin-alerts");
      if (listRes.ok) {
        const { data } = await listRes.json();
        const match = data?.find((a: {
          id: number; location_id: number; course_title: string;
          alert_start_time: string; alert_end_time: string;
        }) =>
          a.location_id === locationId &&
          a.course_title === courseTitle &&
          a.alert_start_time === startTime &&
          a.alert_end_time === endTime
        );
        if (match) {
          await fetch("/api/dropin-alerts", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: match.id }),
          });
        }
      }
    }
  };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <span className="opacity-30">↕</span>;
    return <span>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const toggleGroup = (type: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const expandAll = () => setCollapsedGroups(new Set());
  const collapseAll = () =>
    setCollapsedGroups(new Set(groups.map((g) => g.program_type)));

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium mb-1">No drop-in sessions found</p>
        <p className="text-sm">
          Try a different date, location, or program type.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Sign in to set drop-in alerts."
      />
      <ScrollHint triggerKey={searchTrigger} />
      {/* Summary header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {total} session{total !== 1 ? "s" : ""} on {dateLabel}
          </p>
          <p className="text-xs text-gray-500">
            {groups.length} program type{groups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={expandAll}
            className={clsx(
              "text-xs hover:underline",
              collapsedGroups.size > 0 ? "text-brand font-semibold" : "text-gray-400"
            )}
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className={clsx(
              "text-xs hover:underline",
              collapsedGroups.size === 0 ? "text-brand font-semibold" : "text-gray-400"
            )}
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Groups */}
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.program_type);
        return (
          <div
            key={group.program_type}
            className="bg-white border-2 border-brand rounded-2xl overflow-hidden"
          >
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.program_type)}
              className="w-full flex items-center justify-between px-5 py-4 bg-brand hover:bg-brand-dark transition text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">
                  {group.program_type}
                </span>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {group.session_count} location
                  {group.session_count !== 1 ? "s" : ""}
                </span>
              </div>
              {isCollapsed ? (
                <ChevronDown size={16} className="text-gray-300 shrink-0" />
              ) : (
                <ChevronUp size={16} className="text-gray-300 shrink-0" />
              )}
            </button>

            {/* Table */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <button onClick={() => handleSort("location")} className="flex items-center gap-1 hover:text-brand transition-colors">
                          Location <SortIcon col="location" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Address
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">
                        District
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">
                        <button onClick={() => handleSort("venue_type")} className="flex items-center gap-1 hover:text-brand transition-colors">
                          Venue Type <SortIcon col="venue_type" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <button onClick={() => handleSort("time")} className="flex items-center gap-1 hover:text-brand transition-colors">
                          Time <SortIcon col="time" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Ages
                      </th>
                      {/* Alert column — no label, icon-only */}
                      <th className="px-3 py-2.5 w-8" aria-label="Alert" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortSessions(group.sessions, sortCol, sortDir).map((session, idx) => (
                      <tr
                        key={`${session.course_id}-${idx}`}
                        className="hover:bg-brand/5 transition"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/venues/${session.location_id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-gray-900 hover:text-brand transition"
                            onClick={() => posthog.capture("dropin_result_venue_click", {
                              location_id:   session.location_id,
                              location_name: session.locations?.name ?? null,
                              activity_type: session.activity_type,
                            })}
                          >
                            {session.locations?.name ?? "Unknown"}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <MapPin size={12} className="shrink-0 text-gray-400" />
                            {session.locations?.address ? (
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(session.locations.address + ", Toronto, ON")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand hover:underline"
                              >
                                {session.locations.address}
                              </a>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-gray-600">
                            {session.locations?.district ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <VenueTypeBadge session={session} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 whitespace-nowrap">
                            {formatTimeRange(session.start_time, session.end_time)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">
                            {formatAgeRange(
                              session.min_age_months,
                              session.max_age_months
                            )}
                          </span>
                        </td>
                        {/* Alert button — time-specific alert for this row */}
                        <td className="px-3 py-3">
                          <DropInAlertButton
                            locationId={session.location_id}
                            courseTitle={session.course_title}
                            startTime={session.start_time}
                            endTime={session.end_time}
                            trackedKeys={trackedKeys}
                            user={user}
                            onToggle={handleAlertToggle}
                            onRequireAuth={() => setShowAuthModal(true)}
                          />
                        </td>
                      </tr>
                    ))}
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
