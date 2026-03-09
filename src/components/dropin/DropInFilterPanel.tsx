"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Loader2, X, Search } from "lucide-react";
import {
  DROPIN_FILTER_OPTIONS,
  DISTRICTS,
  RADIUS_OPTIONS,
  ACTIVITY_FILTER_OPTIONS,
  SUB_ACTIVITY_MAP,
} from "@/lib/config/dropinFilters";
import { filterBorder, BRAND_BORDER } from "@/lib/config/filterUI";
import { useNearMe } from "@/lib/hooks/useNearMe";
import clsx from "clsx";

export interface DropInFilters {
  date: string;
  activityType: string;       // "" | "skating" | "sports" | "aquatics" | "fitness" | "arts"
  subActivity: string;        // "" = all sub-activities within activityType
  selectedPrograms: string[]; // chip key values — used in skating mode only
  ageCategory: string;        // "" | "baby" | "preschool" | "child" | "youth" | "adult" | "older"
  district: string;
  venueSearch: string;
  lat: number | null;
  lng: number | null;
  radiusKm: string;
  isNearMe: boolean;
  timeFrom: string; // "HH:MM" or "" = no lower limit
  timeTo: string;   // "HH:MM" or "" = no upper limit
  query: string;
}

interface DropInFilterPanelProps {
  filters: DropInFilters;
  onChange: (filters: DropInFilters) => void;
  onSearch: () => void;
  loading: boolean;
}

// Preset quick-select options for the Time of Day dropdown
const PRESET_RANGES: Record<string, { from: string; to: string }> = {
  "":        { from: "",      to: ""      },
  morning:   { from: "06:00", to: "12:00" },
  afternoon: { from: "12:00", to: "17:00" },
  evening:   { from: "17:00", to: "23:00" },
};

// 4 AM → 11 PM in 1-hour increments
const TIME_OPTIONS = Array.from({ length: 20 }, (_, i) => {
  const hour = i + 4;
  const h = String(hour).padStart(2, "0");
  const label =
    hour === 12
      ? "12:00 PM"
      : hour < 12
      ? `${hour}:00 AM`
      : `${hour - 12}:00 PM`;
  return { value: `${h}:00`, label };
});

// Leisure defaults: "All Ages" + "Adult 19+"
const LEISURE_DEFAULTS = ["leisure-all", "leisure-adult"];

const AGE_OPTIONS = [
  { value: "",          label: "All Ages" },
  { value: "baby",      label: "Baby & Toddler (0–3 yrs)" },
  { value: "preschool", label: "Preschool (3–6 yrs)" },
  { value: "child",     label: "Child (6–12 yrs)" },
  { value: "youth",     label: "Youth (12–18 yrs)" },
  { value: "adult",     label: "Adult (18+ yrs)" },
  { value: "older",     label: "Older Adult (60+ yrs)" },
];

// Activity options for dropdown (no "All Activities")
const ACTIVITY_OPTIONS = ACTIVITY_FILTER_OPTIONS.filter((a) => a.value !== "");

type SkatingGroup = "leisure" | "shinny" | "special";


export function DropInFilterPanel({
  filters,
  onChange,
  onSearch,
  loading,
}: DropInFilterPanelProps) {
  const { loading: geoLoading, request: requestNearMe } = useNearMe();
  const [presetKey, setPresetKey] = useState<"" | "morning" | "afternoon" | "evening">("");
  const [timeMode, setTimeMode] = useState<"preset" | "range">("preset");

  // Attention-indicator touched flags
  const [dateTouched, setDateTouched] = useState(false);
  const [timeTouched, setTimeTouched] = useState(false);
  const [locationTouched, setLocationTouched] = useState(false);
  const [activityTouched, setActivityTouched] = useState(false);

  // Button pulse: blinks until search is run; re-blinks on filter change after search
  const [filterChangedSinceSearch, setFilterChangedSinceSearch] = useState(true);

  // Activity chosen: true once user has picked from dropdown; false when text search is active
  const [activityChosen, setActivityChosen] = useState(false);

  // Skating sub-type active group — default to Leisure when panel opens
  const [activeSkatingGroup, setActiveSkatingGroup] = useState<SkatingGroup | null>("leisure");

  // ── Helpers ──────────────────────────────────────────────────────────────

  const markChanged = () => setFilterChangedSinceSearch(true);

  const handleSearch = () => {
    // Require either an activity selection or a text query before searching
    if (!activityChosen && !filters.query) return;
    setFilterChangedSinceSearch(false);
    // Mark everything as touched on search
    setDateTouched(true);
    setTimeTouched(true);
    setLocationTouched(true);
    setActivityTouched(true);
    onSearch();
  };

  // ── Time handlers ─────────────────────────────────────────────────────────

  const handlePresetChange = (key: string) => {
    const k = key as "" | "morning" | "afternoon" | "evening";
    setPresetKey(k);
    setTimeMode("preset");
    const range = PRESET_RANGES[k] ?? { from: "", to: "" };
    setTimeTouched(true);
    markChanged();
    onChange({ ...filters, timeFrom: range.from, timeTo: range.to });
  };

  const handleFromChange = (val: string) => {
    setTimeMode("range");
    setPresetKey("");
    const newTo = filters.timeTo && val && filters.timeTo <= val ? "" : filters.timeTo;
    setTimeTouched(true);
    markChanged();
    onChange({ ...filters, timeFrom: val, timeTo: newTo });
  };

  const handleToChange = (val: string) => {
    setTimeMode("range");
    setPresetKey("");
    setTimeTouched(true);
    markChanged();
    onChange({ ...filters, timeTo: val });
  };

  // ── Location handlers ─────────────────────────────────────────────────────

  const handleNearMe = () => requestNearMe((lat, lng) => {
    onChange({ ...filters, lat, lng, district: "", venueSearch: "", isNearMe: true });
    setLocationTouched(true);
    markChanged();
  });

  const clearNearMe = () => {
    onChange({ ...filters, lat: null, lng: null, isNearMe: false });
    markChanged();
  };

  // ── Activity handler ──────────────────────────────────────────────────────

  const handleActivityChange = (val: string) => {
    setActivityTouched(true);
    markChanged();
    if (val === "skating") {
      setActiveSkatingGroup("leisure");
      onChange({ ...filters, activityType: "", subActivity: "", selectedPrograms: LEISURE_DEFAULTS, ageCategory: "", query: "" });
    } else {
      setActiveSkatingGroup(null);
      onChange({ ...filters, activityType: val, subActivity: "", selectedPrograms: [], ageCategory: "", query: "" });
    }
  };

  const handleQueryChange = (val: string) => {
    setActivityTouched(true);
    markChanged();
    setActivityChosen(false); // reset to "Choose activity" when text search is used
    onChange({ ...filters, query: val, activityType: "", subActivity: "", selectedPrograms: [], ageCategory: "" });
  };

  // ── Location / Activity opacity helpers ───────────────────────────────────

  const locationMode = filters.isNearMe
    ? "nearme"
    : filters.district
    ? "district"
    : filters.venueSearch
    ? "venue"
    : "";

  const locationInactive = (mode: string) =>
    locationMode !== "" && locationMode !== mode ? "opacity-40" : "";

  const activityInactive = !!filters.query ? "opacity-40" : "";
  const queryInactive    = !!filters.activityType ? "opacity-40" : "";

  // ── Skating group handler ─────────────────────────────────────────────────

  const handleSkatingGroup = (group: SkatingGroup) => {
    if (activeSkatingGroup === group) {
      // Deselect
      setActiveSkatingGroup(null);
      onChange({ ...filters, selectedPrograms: [] });
      markChanged();
      return;
    }
    setActiveSkatingGroup(group);
    markChanged();

    if (group === "leisure") {
      // Always reset to defaults when Leisure is (re)selected
      onChange({ ...filters, selectedPrograms: LEISURE_DEFAULTS });
    } else {
      onChange({ ...filters, selectedPrograms: [] });
    }
  };

  const toggleProgram = (value: string) => {
    const selected = filters.selectedPrograms;
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    markChanged();
    onChange({ ...filters, selectedPrograms: next });
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const isSkating = !filters.activityType || filters.activityType === "skating";
  const currentActivityValue = activityChosen ? (filters.activityType || "skating") : "";

  const skatingGroupOptions = activeSkatingGroup
    ? DROPIN_FILTER_OPTIONS.filter((o) => o.group === activeSkatingGroup)
    : [];

  return (
    <div className="bg-white border-2 border-brand rounded-2xl shadow-sm p-3 space-y-2">

      {/* ── Row 1: Date (left) + Time of Day (right) ──────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Date */}
        <div
          className={filterBorder(dateTouched)}
          style={BRAND_BORDER}
        >
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => {
              setDateTouched(true);
              markChanged();
              onChange({ ...filters, date: e.target.value });
            }}
            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Time of Day */}
        <div
          className={filterBorder(timeTouched)}
          style={BRAND_BORDER}
        >
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Time of Day
          </label>
          {/* Preset dropdown */}
          <div className={clsx("relative mb-2", timeMode === "range" && "opacity-40")}>
            <select
              value={presetKey}
              onChange={(e) => handlePresetChange(e.target.value)}
              onClick={() => {
                if (timeMode === "range") {
                  setTimeMode("preset");
                  setPresetKey("");
                  setTimeTouched(true);
                  markChanged();
                  onChange({ ...filters, timeFrom: "", timeTo: "" });
                }
              }}
              className={clsx(
                "appearance-none w-full bg-white border rounded-lg px-2 py-1 pr-6 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand",
                presetKey ? "border-[#1a3a2a] border-2" : "border-gray-200"
              )}
            >
              <option value="">All day</option>
              <option value="morning">Morning 6–12</option>
              <option value="afternoon">Afternoon 12–5</option>
              <option value="evening">Evening 5–11</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {/* From / To */}
          <div className={clsx("flex gap-1.5", timeMode === "preset" && "opacity-40")}>
            <div className="relative flex-1">
              <select
                value={filters.timeFrom}
                onChange={(e) => handleFromChange(e.target.value)}
                className={clsx(
                  "appearance-none w-full bg-white border rounded-lg px-2 py-1 pr-5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand",
                  filters.timeFrom ? "border-[#1a3a2a] border-2" : "border-gray-200"
                )}
              >
                <option value="">From</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select
                value={filters.timeTo}
                onChange={(e) => handleToChange(e.target.value)}
                className={clsx(
                  "appearance-none w-full bg-white border rounded-lg px-2 py-1 pr-5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand",
                  filters.timeTo ? "border-[#1a3a2a] border-2" : "border-gray-200"
                )}
              >
                <option value="">To</option>
                {TIME_OPTIONS.filter((t) => !filters.timeFrom || t.value > filters.timeFrom).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Location ──────────────────────────────────────────────────────── */}
      <div
        className={filterBorder(locationTouched)}
        style={BRAND_BORDER}
      >
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Location
        </label>
        <div className="flex gap-1.5 items-center">
          {/* Near Me */}
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

          {/* District dropdown */}
          <div className={clsx("relative flex-1", locationInactive("district"))}>
            <select
              value={filters.district}
              onChange={(e) => {
                setLocationTouched(true);
                markChanged();
                onChange({ ...filters, district: e.target.value, venueSearch: "", isNearMe: false, lat: null, lng: null });
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

          {/* Venue name search */}
          <div className={clsx("relative flex-1", locationInactive("venue"))}>
            <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filters.venueSearch}
              placeholder="Venue name"
              onChange={(e) => {
                setLocationTouched(true);
                markChanged();
                onChange({ ...filters, venueSearch: e.target.value, district: "", isNearMe: false, lat: null, lng: null });
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className={clsx(
                "w-full border rounded-lg pl-6 pr-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand",
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
              onChange={(e) => { markChanged(); onChange({ ...filters, radiusKm: e.target.value }); }}
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

      {/* ── Activity + sub-types ──────────────────────────────────────────── */}
      <div
        className={filterBorder(activityTouched)}
        style={BRAND_BORDER}
      >
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Activity or Program Name
        </label>

        {/* Row: activity dropdown + "or" + search — same line (matches registered programs) */}
        <div className="flex gap-1.5 items-center">
          <div className={clsx("relative flex-1", activityInactive)}>
            <select
              value={currentActivityValue}
              onChange={(e) => {
                setActivityChosen(true);
                handleActivityChange(e.target.value);
              }}
              className={clsx(
                "appearance-none w-full bg-white border rounded-lg px-2 py-1.5 pr-6 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand",
                activityChosen ? "border-[#1a3a2a] border-2" : "border-gray-200"
              )}
            >
              {!activityChosen && (
                <option value="" disabled>Choose activity</option>
              )}
              {ACTIVITY_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <span className="text-xs text-gray-400 font-medium shrink-0">or</span>

          <div className={clsx("relative flex-1", queryInactive)}>
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filters.query}
              placeholder="Program name"
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className={clsx(
                "w-full border rounded-lg pl-6 pr-5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand",
                filters.query ? "border-[#1a3a2a] border-2" : "border-gray-200"
              )}
            />
            {filters.query && (
              <button
                onClick={() => { markChanged(); onChange({ ...filters, query: "" }); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Skating sub-types below */}
        {activityChosen && isSkating && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(["leisure", "shinny", "special"] as SkatingGroup[]).map((group) => {
              const labels: Record<SkatingGroup, string> = { leisure: "Leisure", shinny: "Shinny", special: "Special" };
              const active = activeSkatingGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => handleSkatingGroup(group)}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-xs font-medium border transition",
                    active ? "bg-brand text-white border-brand" : "bg-white text-gray-500 border-gray-200 hover:border-brand/60"
                  )}
                >
                  {labels[group]}
                </button>
              );
            })}
          </div>
        )}

        {/* Skating chip grid */}
        {activityChosen && isSkating && activeSkatingGroup && skatingGroupOptions.length > 0 && (
          <div className="border-2 border-brand rounded-xl p-2.5 grid grid-cols-2 gap-1.5 mt-2">
            {skatingGroupOptions.map((opt) => {
              const active = filters.selectedPrograms.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleProgram(opt.value)}
                  className={clsx(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-sm transition",
                    active ? "bg-brand text-white border-brand" : "bg-white text-gray-700 border-gray-200 hover:border-brand/60"
                  )}
                >
                  <span className="font-medium text-left leading-tight">{opt.label}</span>
                  <span className={clsx("ml-2 text-xs font-semibold shrink-0", active ? "text-white/70" : "text-gray-400")}>
                    {opt.ageLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Non-skating sub-activity chips below */}
        {activityChosen && !isSkating && SUB_ACTIVITY_MAP[filters.activityType] && (
          <div className="flex flex-wrap gap-1 mt-2">
            <button
              onClick={() => { markChanged(); onChange({ ...filters, subActivity: "" }); }}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition",
                !filters.subActivity ? "bg-brand text-white border-brand" : "bg-white text-gray-500 border-gray-200 hover:border-brand/60"
              )}
            >
              All
            </button>
            {SUB_ACTIVITY_MAP[filters.activityType].map((s) => (
              <button
                key={s.value}
                onClick={() => { markChanged(); onChange({ ...filters, subActivity: s.value }); }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition",
                  filters.subActivity === s.value ? "bg-brand text-white border-brand" : "bg-white text-gray-500 border-gray-200 hover:border-brand/60"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Age category dropdown — non-skating only */}
        {activityChosen && !isSkating && (
          <div className="relative mt-2.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              Age Group
            </label>
            <select
              value={filters.ageCategory}
              onChange={(e) => { markChanged(); onChange({ ...filters, ageCategory: e.target.value }); }}
              className={clsx(
                "appearance-none w-full bg-white border rounded-lg px-2 py-1.5 pr-6 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand",
                filters.ageCategory ? "border-[#1a3a2a] border-2" : "border-gray-200"
              )}
            >
              {AGE_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-1.5 bottom-2.5 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* ── Find Drop-ins button ──────────────────────────────────────────── */}
      <button
        onClick={handleSearch}
        disabled={loading}
        style={filterChangedSinceSearch ? { borderColor: "#1a3a2a" } : undefined}
        className={clsx(
          "w-full bg-brand text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-dark transition disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-transparent",
          filterChangedSinceSearch && "animate-filter-pulse"
        )}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? "Searching..." : "Find Drop-ins"}
      </button>
    </div>
  );
}
