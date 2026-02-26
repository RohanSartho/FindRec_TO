"use client";

import { formatTimeRange, formatAgeRange } from "@/lib/utils/timetable";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface Session {
  course_id: number;
  course_title: string;
  start_time: string;
  end_time: string;
  min_age_months: number | null;
  max_age_months: number | null;
  location_id: number;
  locations: {
    name: string;
    address: string | null;
    district: string | null;
    rinks?: Array<{ asset_id: number }>;
  } | null;
}

interface Group {
  program_type: string;
  session_count: number;
  sessions: Session[];
}

interface DropInResultsTableProps {
  groups: Group[];
  total: number;
  date: string;
}

export function DropInResultsTable({
  groups,
  total,
  date,
}: DropInResultsTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );

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
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium mb-1">No drop-in sessions found</p>
        <p className="text-sm">
          Try a different date, location, or program type.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {total} session{total !== 1 ? "s" : ""} on {dateLabel}
          </p>
          <p className="text-xs text-gray-400">
            {groups.length} program type{groups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={expandAll}
            className="text-xs text-blue-600 hover:underline"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-400 hover:underline"
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
            className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
          >
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.program_type)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">
                  {group.program_type}
                </span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  {group.session_count} location
                  {group.session_count !== 1 ? "s" : ""}
                </span>
              </div>
              {isCollapsed ? (
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              ) : (
                <ChevronUp size={16} className="text-gray-400 shrink-0" />
              )}
            </button>

            {/* Table */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Location
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                        Address
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                        District
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Time
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                        Ages
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.sessions.map((session, idx) => (
                      <tr
                        key={`${session.course_id}-${idx}`}
                        className="hover:bg-blue-50/30 transition"
                      >
                        <td className="px-5 py-3">
                          {session.locations?.rinks?.[0]?.asset_id ? (
                            <Link
                              href={`/skating/${session.locations.rinks[0].asset_id}`}
                              className="font-medium text-gray-900 hover:text-blue-600 transition"
                            >
                              {session.locations?.name ?? "Unknown"}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">
                              {session.locations?.name ?? "Unknown"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-1 text-xs">
                            <MapPin size={11} className="shrink-0 text-gray-400" />
                            {session.locations?.address ? (
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(session.locations.address + ", Toronto, ON")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {session.locations.address}
                              </a>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-gray-500">
                            {session.locations?.district ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 whitespace-nowrap">
                            {formatTimeRange(session.start_time, session.end_time)}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-500">
                            {formatAgeRange(
                              session.min_age_months,
                              session.max_age_months
                            )}
                          </span>
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
