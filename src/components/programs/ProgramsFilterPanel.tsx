"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Loader2, X, Search, Calendar } from "lucide-react";
import {
  DISTRICTS,
  RADIUS_OPTIONS,
  ACTIVITY_FILTER_OPTIONS,
  PROGRAMS_SUB_ACTIVITY_MAP,
} from "@/lib/config/dropinFilters";
import { filterBorder, BRAND_BORDER } from "@/lib/config/filterUI";
import { useNearMe } from "@/lib/hooks/useNearMe";
import clsx from "clsx";

export interface ProgramFilters {
  dateFrom: string;
  dateTo: string;
  timeOfDay: string;
  activityType: string;
  subActivity: string;
  district: string;
  lat: number | null;
  lng: number | null;
  radiusKm: string;
  isNearMe: boolean;
  venueSearch: string;
  ageCategory: string;
  query: string;
}

interface ProgramsFilterPanelProps {
  filters: ProgramFilters;
  onChange: (filters: ProgramFilters) => void;
  onSearch: () => void;
  loading: boolean;
  // Dynamic search props (from ProgramsSection):
  // searchDone — true after the user's first explicit search; gates auto-search behaviour
  searchDone: boolean;
  // filtersDirty — true when filters changed since last search; drives button pulse + label
  filtersDirty: boolean;
}

const AGE_OPTIONS = [
  { value: "",          label: "All Ages" },
  { value: "baby",      label: "Baby & Toddler (0–3 yrs)" },
  { value: "preschool", label: "Preschool (3–6 yrs)" },
  { value: "child",     label: "Child (6–12 yrs)" },
  { value: "youth",     label: "Youth (12–18 yrs)" },
  { value: "adult",     label: "Adult (18–60 yrs)" },
  { value: "older",     label: "Older Adult (60+ yrs)" },
];


function formatDisplayDate(d: string): string {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export function ProgramsFilterPanel({
  filters,
  onChange,
  onSearch,
  loading,
  searchDone,
  filtersDirty,
}: ProgramsFilterPanelProps) {
  const { loading: geoLoading, request: requestNearMe } = useNearMe();
  const [dateOpen, setDateOpen] = useState(false);

  const [dateTouched,     setDateTouched]     = useState(false);
  const [timeTouched,     setTimeTouched]     = useState(false);
  const [locationTouched, setLocationTouched] = useState(false);
  const [activityTouched, setActivityTouched] = useState(false);

  // ── Button state ──────────────────────────────────────────────────────────
  // Three states:
  //   cold  (!searchDone):               pulse, "Find Programs"   — prompt first explicit click
  //   dirty (searchDone && filtersDirty): pulse, "Update Results"  — filters changed since last search
  //   clean (searchDone && !filtersDirty): no pulse, "Find Programs" — results are current
  const isPending = !searchDone || filtersDirty;
  const buttonLabel = loading
    ? "Searching…"
    : searchDone && filtersDirty
    ? "Update Results"
    : "Find Programs";

  // ── Search handler ────────────────────────────────────────────────────────

  const handleSearch = () => {
    // Mark all sections touched so attention borders appear
    setDateTouched(true);
    setTimeTouched(true);
    setLocationTouched(true);
    setActivityTouched(true);
    onSearch();
  };

  // ── Location — all three always clickable; selecting one clears others ───
  const locationMode = filters.isNearMe
    ? "nearme"
    : filters.district
    ? "district"
    : filters.venueSearch
    ? "venue"
    : "";

  const handleNearMe = () => requestNearMe((lat, lng) => {
    onChange({ ...filters, lat, lng, district: "", venueSearch: "", isNearMe: true });
    setLocationTouched(true);
  });

  const clearNearMe = () => {
    onChange({ ...filters, lat: null, lng: null, isNearMe: false });
  };

  // ── Activity / Program name — selecting one clears the other ────────────
  const handleActivityChange = (val: string) => {
    setActivityTouched(true);
    // Clear program-name query when switching to activity filter
    onChange({ ...filters, activityType: val, subActivity: "", query: "" });
  };

  const handleQueryChange = (val: string) => {
    setActivityTouched(true);
    // Clear activity type when switching to text search
    onChange({ ...filters, query: val, activityType: "", subActivity: "" });
  };

  // Active indicator only (no pointer-events-none — always interactive)
  const locationInactive = (mode: string) =>
    locationMode !== "" && locationMode !== mode ? "opacity-40" : "";

  const activityInactive = !!filters.query ? "opacity-40" : "";
  const queryInactive    = !!filters.activityType ? "opacity-40" : "";

  // Collapsed date label
  const dateLabel =
    filters.dateFrom
      ? `${formatDisplayDate(filters.dateFrom)}${
          filters.dateTo && filters.dateTo !== filters.dateFrom
            ? ` – ${formatDisplayDate(filters.dateTo)}`
            : ""
        }`
      : "Select dates";

  return (
    <div className="bg-white border-2 border-brand rounded-2xl shadow-sm p-3 space-y-2">

      {/* ── Row 1: Date range + Time of Day ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">

        {/* Date range — collapsible */}
        <div className={filterBorder(dateTouched)} style={BRAND_BORDER}>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Dates
          </label>
          <button
            type="button"
            onClick={() => setDateOpen((o) => !o)}
            className="w-full flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:border-brand transition"
          >
            <Calendar size={12} className="text-gray-400 shrink-0" />
            <span className={clsx("truncate", !filters.dateFrom && "text-gray-400")}>
              {dateLabel}
            </span>
          </button>
          {dateOpen && (
            <div className="mt-1 space-y-1">
              {/* Date inputs auto-search on change (dateFrom/dateTo are in the Section's auto-search effect deps) */}
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  setDateTouched(true);
                  onChange({ ...filters, dateFrom: e.target.value });
                }}
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom}
                onChange={(e) => {
                  setDateTouched(true);
                  onChange({ ...filters, dateTo: e.target.value });
                  if (e.target.value) setDateOpen(false);
                }}
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          )}
        </div>

        {/* Time of Day */}
        <div className={filterBorder(timeTouched)} style={BRAND_BORDER}>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Time of Day
          </label>
          <div className="relative">
            <select
              value={filters.timeOfDay}
              onChange={(e) => {
                setTimeTouched(true);
                onChange({ ...filters, timeOfDay: e.target.value });
              }}
              className="appearance-none w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 pr-6 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Any time</option>
              <option value="morning">Morning 6–12</option>
              <option value="afternoon">Afternoon 12–5</option>
              <option value="evening">Evening 5–11</option>
            </select>
            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Location ──────────────────────────────────────────────────────── */}
      <div className={filterBorder(locationTouched)} style={BRAND_BORDER}>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
          Location
        </label>

        <div className="flex gap-1.5 items-center">
          {/* Near Me — always clickable; clears district + venueSearch on activate */}
          {locationMode === "nearme" ? (
            <div className="flex items-center gap-1 bg-brand text-white rounded-lg px-2 py-1.5 text-sm font-medium shrink-0">
              <MapPin size={12} />
              <span>Near Me</span>
              <button onClick={clearNearMe} className="ml-0.5 hover:text-white/70 transition">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleNearMe}
              disabled={geoLoading}
              className={clsx(
                "flex items-center gap-1 border rounded-lg px-2 py-1.5 text-sm transition shrink-0",
                locationInactive("nearme"),
                "border-gray-200 text-gray-600 hover:border-brand hover:text-brand"
              )}
            >
              {geoLoading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
              Near Me
            </button>
          )}

          {/* District dropdown — always interactive; clears nearMe + venueSearch when changed */}
          <div className={clsx("relative flex-1", locationInactive("district"))}>
            <select
              value={filters.district}
              onChange={(e) => {
                setLocationTouched(true);
                onChange({
                  ...filters,
                  district: e.target.value,
                  venueSearch: "",
                  isNearMe: false,
                  lat: null,
                  lng: null,
                });
              }}
              className={clsx(
                "appearance-none w-full bg-white border rounded-lg px-2 py-1.5 pr-5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand",
                filters.district ? "border-[#1a3a2a] border-2" : "border-gray-200"
              )}
            >
              {DISTRICTS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Venue search — text input; Enter key triggers search in warm state */}
          <div className={clsx("relative flex-1", locationInactive("venue"))}>
            <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filters.venueSearch}
              placeholder="Venue name"
              onChange={(e) => {
                setLocationTouched(true);
                onChange({
                  ...filters,
                  venueSearch: e.target.value,
                  district: "",
                  isNearMe: false,
                  lat: null,
                  lng: null,
                });
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className={clsx(
                "w-full border rounded-lg pl-6 pr-2 py-1.5 text-base sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand",
                filters.venueSearch ? "border-[#1a3a2a] border-2" : "border-gray-200"
              )}
            />
          </div>
        </div>

        {/* Radius row — only when Near Me active */}
        {locationMode === "nearme" && (
          <div className="relative mt-1.5">
            <select
              value={filters.radiusKm}
              onChange={(e) => {
                onChange({ ...filters, radiusKm: e.target.value });
              }}
              className="appearance-none w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 pr-6 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* ── Activity OR Program name ───────────────────────────────────────── */}
      <div className={filterBorder(activityTouched)} style={BRAND_BORDER}>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
          Activity or Program Name
        </label>
        <div className="flex gap-1.5 items-center">
          {/* Activity select — always interactive; clears query on change */}
          <div className={clsx("relative flex-1", activityInactive)}>
            <select
              value={filters.activityType}
              onChange={(e) => handleActivityChange(e.target.value)}
              className={clsx(
                "appearance-none w-full bg-white border rounded-lg px-2 py-1.5 pr-6 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand",
                filters.activityType ? "border-[#1a3a2a] border-2" : "border-gray-200"
              )}
            >
              {ACTIVITY_FILTER_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <span className="text-xs text-gray-400 font-medium shrink-0">or</span>

          {/* Program name text search — Enter key triggers search in warm state */}
          <div className={clsx("relative flex-1", queryInactive)}>
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filters.query}
              placeholder="Program name"
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className={clsx(
                "w-full border rounded-lg pl-6 pr-5 py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand",
                filters.query ? "border-[#1a3a2a] border-2" : "border-gray-200"
              )}
            />
            {filters.query && (
              <button
                onClick={() => { onChange({ ...filters, query: "" }); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Sub-activity chips — programs-specific map */}
        {filters.activityType && PROGRAMS_SUB_ACTIVITY_MAP[filters.activityType] && (
          <div className="flex flex-wrap gap-1 mt-2">
            <button
              onClick={() => { onChange({ ...filters, subActivity: "" }); }}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition",
                !filters.subActivity
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-500 border-gray-200 hover:border-brand/60"
              )}
            >
              All
            </button>
            {PROGRAMS_SUB_ACTIVITY_MAP[filters.activityType].map((s) => (
              <button
                key={s.value}
                onClick={() => { onChange({ ...filters, subActivity: s.value }); }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition",
                  filters.subActivity === s.value
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-gray-500 border-gray-200 hover:border-brand/60"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Age Category ──────────────────────────────────────────────────── */}
      <div className="border-2 rounded-xl p-2" style={BRAND_BORDER}>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
          Age Category
        </label>
        <div className="relative">
          <select
            value={filters.ageCategory}
            onChange={(e) => { onChange({ ...filters, ageCategory: e.target.value }); }}
            className="appearance-none w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 pr-6 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {AGE_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Find Programs button ───────────────────────────────────────────── */}
      {/* isPending: true in cold state (!searchDone) OR when filters changed since last search.
          Shows pulse animation to prompt action. Label changes to "Update Results" in dirty warm state. */}
      <button
        onClick={handleSearch}
        disabled={loading}
        style={isPending ? { borderColor: "#1a3a2a" } : undefined}
        className={clsx(
          "w-full bg-brand text-white rounded-xl py-2 text-sm font-medium hover:bg-brand-dark transition disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-transparent",
          isPending && "animate-filter-pulse"
        )}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {buttonLabel}
      </button>
    </div>
  );
}
