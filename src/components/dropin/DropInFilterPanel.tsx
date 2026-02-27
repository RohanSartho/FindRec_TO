"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Loader2, X } from "lucide-react";
import {
  DROPIN_FILTER_OPTIONS,
  DISTRICTS,
  RADIUS_OPTIONS,
} from "@/lib/config/dropinFilters";
import clsx from "clsx";

export interface DropInFilters {
  date: string;
  selectedPrograms: string[]; // chip key values (e.g. "leisure-adult")
  district: string;
  lat: number | null;
  lng: number | null;
  radiusKm: string;
  isNearMe: boolean;
  timeFrom: string; // "HH:MM" or "" = no lower limit
  timeTo: string;   // "HH:MM" or "" = no upper limit
}

interface DropInFilterPanelProps {
  filters: DropInFilters;
  onChange: (filters: DropInFilters) => void;
  onSearch: () => void;
  loading: boolean;
}

const GROUP_LABELS = {
  leisure: "Leisure Skate",
  shinny: "Shinny / Hockey",
  special: "Special Programs",
};

// Preset quick-select options for the Time of Day dropdown
const PRESET_RANGES: Record<string, { from: string; to: string }> = {
  "":          { from: "",      to: ""      },
  morning:     { from: "06:00", to: "12:00" },
  afternoon:   { from: "12:00", to: "17:00" },
  evening:     { from: "17:00", to: "23:00" },
};

// 4 AM → 11 PM in 1-hour increments
const TIME_OPTIONS = Array.from({ length: 20 }, (_, i) => {
  const hour = i + 4; // 4..23
  const h = String(hour).padStart(2, "0");
  const label =
    hour === 12
      ? "12:00 PM"
      : hour < 12
      ? `${hour}:00 AM`
      : `${hour - 12}:00 PM`;
  return { value: `${h}:00`, label };
});

export function DropInFilterPanel({
  filters,
  onChange,
  onSearch,
  loading,
}: DropInFilterPanelProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  // "preset" = Time of Day dropdown active; "range" = From–To active
  const [timeMode, setTimeMode] = useState<"preset" | "range">("preset");
  const [presetKey, setPresetKey] = useState<"" | "morning" | "afternoon" | "evening">("");
  // Collapsible groups — all expanded by default
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    leisure: true,
    shinny: true,
    special: true,
  });

  // ── Time handlers ──────────────────────────────────────────────────────────

  const handlePresetChange = (key: string) => {
    const k = key as "" | "morning" | "afternoon" | "evening";
    setPresetKey(k);
    setTimeMode("preset");
    const range = PRESET_RANGES[k] ?? { from: "", to: "" };
    onChange({ ...filters, timeFrom: range.from, timeTo: range.to });
  };

  const handleFromChange = (val: string) => {
    setTimeMode("range");
    setPresetKey("");
    onChange({ ...filters, timeFrom: val });
  };

  const handleToChange = (val: string) => {
    setTimeMode("range");
    setPresetKey("");
    onChange({ ...filters, timeTo: val });
  };

  // ── Program chip handlers ──────────────────────────────────────────────────

  const toggleProgram = (value: string) => {
    const selected = filters.selectedPrograms;
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange({ ...filters, selectedPrograms: next });
  };

  const selectAllInGroup = (group: "leisure" | "shinny" | "special") => {
    const groupValues = DROPIN_FILTER_OPTIONS
      .filter((o) => o.group === group)
      .map((o) => o.value);
    const allSelected = groupValues.every((v) =>
      filters.selectedPrograms.includes(v)
    );
    const current = filters.selectedPrograms.filter(
      (v) => !groupValues.includes(v)
    );
    onChange({
      ...filters,
      selectedPrograms: allSelected ? current : [...current, ...groupValues],
    });
  };

  const clearAll = () => onChange({ ...filters, selectedPrograms: [] });
  const selectAll = () =>
    onChange({
      ...filters,
      selectedPrograms: DROPIN_FILTER_OPTIONS.map((o) => o.value),
    });

  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Location handlers ──────────────────────────────────────────────────────

  const handleNearMe = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          ...filters,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          district: "",
          isNearMe: true,
        });
        setGeoLoading(false);
      },
      () => {
        alert("Unable to get your location.");
        setGeoLoading(false);
      }
    );
  };

  const clearNearMe = () => {
    onChange({ ...filters, lat: null, lng: null, isNearMe: false });
  };

  const groups = (["leisure", "shinny", "special"] as const).map((g) => ({
    key: g,
    label: GROUP_LABELS[g],
    options: DROPIN_FILTER_OPTIONS.filter((o) => o.group === g),
  }));

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-sm p-5 space-y-5">

      {/* ── Date picker ─────────────────────────────────────────────────────── */}
      <div>
        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide block mb-2">
          Date
        </label>
        <input
          type="date"
          value={filters.date}
          onChange={(e) => onChange({ ...filters, date: e.target.value })}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ── Time filter — preset dropdown + custom range, mutually exclusive ── */}
      <div>
        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide block mb-2">
          Time of Day
        </label>
        <div className="flex items-center gap-2">

          {/* Preset dropdown — greyed when range mode is active */}
          <div className={clsx(
            "relative transition-opacity",
            timeMode === "range" && "opacity-40 pointer-events-none"
          )}>
            <select
              value={presetKey}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All day</option>
              <option value="morning">Morning  6–12</option>
              <option value="afternoon">Afternoon  12–5</option>
              <option value="evening">Evening  5–11</option>
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          <span className="text-xs text-gray-400 shrink-0">or</span>

          {/* Custom From–To — greyed when preset mode is active */}
          <div className={clsx(
            "flex items-center gap-1.5 transition-opacity",
            timeMode === "preset" && "opacity-40 pointer-events-none"
          )}>
            <div className="relative">
              <select
                value={filters.timeFrom}
                onChange={(e) => handleFromChange(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">From</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <span className="text-xs text-gray-400">–</span>
            <div className="relative">
              <select
                value={filters.timeTo}
                onChange={(e) => handleToChange(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">To</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Location filter ──────────────────────────────────────────────────── */}
      <div>
        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide block mb-2">
          Location
        </label>
        <div className="flex gap-2 items-center">
          {filters.isNearMe ? (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm text-blue-700 shrink-0">
              <MapPin size={13} />
              <span>Near Me</span>
              <button onClick={clearNearMe} className="ml-1 hover:text-blue-900">
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleNearMe}
              disabled={geoLoading}
              className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition shrink-0"
            >
              {geoLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <MapPin size={13} />
              )}
              Near Me
            </button>
          )}

          {!filters.isNearMe && (
            <div className="relative flex-1">
              <select
                value={filters.district}
                onChange={(e) => onChange({ ...filters, district: e.target.value })}
                className="appearance-none w-full bg-white border border-gray-200 rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DISTRICTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}

          {filters.isNearMe && (
            <div className="relative flex-1">
              <select
                value={filters.radiusKm}
                onChange={(e) => onChange({ ...filters, radiusKm: e.target.value })}
                className="appearance-none w-full bg-white border border-gray-200 rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* ── Search button ────────────────────────────────────────────────────── */}
      <button
        onClick={onSearch}
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? "Searching..." : "Find Drop-ins"}
      </button>

      {/* ── Program type filter ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Program Type
          </label>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">
              All
            </button>
            <span className="text-sm text-gray-300">·</span>
            <button onClick={clearAll} className="text-sm text-gray-400 hover:underline">
              None
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {groups.map((group) => {
            const groupValues = group.options.map((o) => o.value);
            const allSelected = groupValues.every((v) =>
              filters.selectedPrograms.includes(v)
            );
            const isExpanded = expandedGroups[group.key] ?? true;

            return (
              <div key={group.key} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Group header — bold, collapsible */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition"
                >
                  <span className="text-sm font-bold text-gray-800">{group.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); selectAllInGroup(group.key); }}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                    {isExpanded
                      ? <ChevronUp size={14} className="text-gray-400 shrink-0" />
                      : <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    }
                  </div>
                </button>

                {/* Chip grid — 2 columns, label + age right-aligned */}
                {isExpanded && (
                  <div className="p-2.5 grid grid-cols-2 gap-1.5">
                    {group.options.map((opt) => {
                      const active = filters.selectedPrograms.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleProgram(opt.value)}
                          className={clsx(
                            "flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-sm transition",
                            active
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                          )}
                        >
                          <span className="font-medium text-left leading-tight">{opt.label}</span>
                          <span className={clsx(
                            "ml-2 text-xs font-semibold shrink-0",
                            active ? "text-blue-200" : "text-gray-400"
                          )}>
                            {opt.ageLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
