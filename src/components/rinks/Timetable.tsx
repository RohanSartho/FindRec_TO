"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import {
  DAY_LABELS, getTodayISO,
  formatTimeRange, formatAgeRange, compactTitle, activityTypeColor,
} from "@/lib/utils/timetable";

type View = "day" | "week";

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
  status: string | null;
  activity_url: string | null;
  program_category: string | null;
}

export function Timetable({ assetId }: { assetId: number }) {
  const [view, setView] = useState<View>("day");
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [dropins, setDropins] = useState<DropIn[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrograms, setShowPrograms] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/rinks/${assetId}/programs?view=${view}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((json) => {
        setDropins(json.data?.dropins ?? []);
        setPrograms(json.data?.programs ?? []);
      })
      .catch(() => setError("Failed to load schedule."))
      .finally(() => setLoading(false));
  }, [assetId, view, selectedDate]);

  // Group by actual date for week view
  const dropinsByDate = dropins.reduce((acc, d) => {
    const date = d.first_date ?? d.day_of_week ?? "unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(d);
    return acc;
  }, {} as Record<string, DropIn[]>);

  // Get sorted unique dates
  const sortedDates = Object.keys(dropinsByDate).sort();

  return (
    <div className="space-y-4">
      {/* View selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-gray-100 rounded-xl overflow-hidden">
          {(["day", "week"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium capitalize transition ${
                view === v
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {v === "day" ? "Today" : "This Week"}
            </button>
          ))}
        </div>

        {/* Date picker for day view */}
        {view === "day" && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          {/* Drop-ins section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Drop-In Schedule
            </h3>

            {view === "week" ? (
              <div className="space-y-4">
                {sortedDates.length === 0 ? (
                  <EmptyState message="No drop-in sessions this week." />
                ) : (
                  sortedDates.map((date) => {
                    const items = dropinsByDate[date];
                    const dateObj = new Date(date + "T00:00:00");
                    const isToday = date === getTodayISO();
                    const dateLabel = dateObj.toLocaleDateString("en-CA", {
                      weekday: "long", month: "short", day: "numeric",
                    });
                    return (
                      <div key={date}>
                        <p className={`text-xs font-semibold mb-2 ${
                          isToday ? "text-blue-600" : "text-gray-500"
                        }`}>
                          {dateLabel}
                          {isToday && (
                            <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                        </p>
                        <div className="space-y-2">
                          {items.map((d) => (
                            <DropInRow key={`${d.course_id}-${date}`} dropin={d} />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // Day view
              <div className="space-y-2">
                {dropins.length === 0 ? (
                  <EmptyState message="No drop-in sessions for this day." />
                ) : (
                  dropins.map((d) => (
                    <DropInRow key={`${d.course_id}-${d.day_of_week}`} dropin={d} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Registered programs — collapsible */}
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={() => setShowPrograms(!showPrograms)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Registered Programs
                {programs.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400 normal-case">
                    {programs.length} available
                  </span>
                )}
              </span>
              {showPrograms ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </button>

            {showPrograms && (
              <div className="mt-3 space-y-2">
                {programs.length === 0 ? (
                  <EmptyState message="No registered programs for this period." />
                ) : (
                  programs.map((p) => (
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

function DropInRow({ dropin, showDay }: { dropin: DropIn; showDay?: boolean }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showDay && (
            <span className="text-xs text-gray-400 shrink-0">
              {DAY_LABELS[dropin.day_of_week]?.slice(0, 3)}
            </span>
          )}
          <span className="text-sm font-medium text-gray-900 truncate">
            {compactTitle(dropin.course_title)}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${activityTypeColor(dropin.activity_type)}`}>
            {dropin.activity_type}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatAgeRange(dropin.min_age_months, dropin.max_age_months)}
        </p>
      </div>
      <div className="text-xs font-medium text-gray-700 shrink-0 text-right">
        {formatTimeRange(dropin.start_time, dropin.end_time)}
      </div>
    </div>
  );
}

function ProgramRow({ program }: { program: Program }) {
  return (
    <div className="flex items-start justify-between bg-blue-50 rounded-xl px-3 py-2.5 gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 truncate">
            {compactTitle(program.activity_title || program.course_title)}
          </span>
          {program.program_category && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${activityTypeColor(program.activity_type)}`}>
              {program.program_category}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {program.days_of_week?.join(", ")} · {formatAgeRange(program.min_age_months, program.max_age_months)}
        </p>
        {program.status && (
          <p className="text-xs text-gray-400 mt-0.5 italic">{program.status}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs font-medium text-gray-700">
          {formatTimeRange(program.start_time, program.end_time)}
        </span>
        {program.activity_url && (
          <a
            href={program.activity_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            Register <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-gray-400 py-4 text-center">{message}</p>
  );
}
