"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Loader2, X } from "lucide-react";
import {
  DROPIN_FILTER_OPTIONS,
  DISTRICTS,
  RADIUS_OPTIONS,
} from "@/lib/config/dropinFilters";
import clsx from "clsx";

export interface DropInFilters {
  date: string;
  selectedPrograms: string[]; // course_title values
  district: string;
  lat: number | null;
  lng: number | null;
  radiusKm: string;
  isNearMe: boolean;
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

export function DropInFilterPanel({
  filters,
  onChange,
  onSearch,
  loading,
}: DropInFilterPanelProps) {
  const [geoLoading, setGeoLoading] = useState(false);

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

  // Group options
  const groups = (["leisure", "shinny", "special"] as const).map((g) => ({
    key: g,
    label: GROUP_LABELS[g],
    options: DROPIN_FILTER_OPTIONS.filter((o) => o.group === g),
  }));

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-sm p-5 space-y-5">
      {/* Date picker */}
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

      {/* Location filter */}
      <div>
        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide block mb-2">
          Location
        </label>
        {/* Near Me + District always side by side */}
        <div className="flex gap-2 items-center">
          {/* Near Me */}
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

          {/* District dropdown */}
          {!filters.isNearMe && (
            <div className="relative flex-1">
              <select
                value={filters.district}
                onChange={(e) =>
                  onChange({ ...filters, district: e.target.value })
                }
                className="appearance-none w-full bg-white border border-gray-200 rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DISTRICTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          )}

          {/* Radius (only when near me) */}
          {filters.isNearMe && (
            <div className="relative flex-1">
              <select
                value={filters.radiusKm}
                onChange={(e) =>
                  onChange({ ...filters, radiusKm: e.target.value })
                }
                className="appearance-none w-full bg-white border border-gray-200 rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Search button */}
      <button
        onClick={onSearch}
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? "Searching..." : "Find Drop-ins"}
      </button>

      {/* Program type filter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Program Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:underline"
            >
              All
            </button>
            <span className="text-sm text-gray-300">·</span>
            <button
              onClick={clearAll}
              className="text-sm text-gray-400 hover:underline"
            >
              None
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {groups.map((group) => {
            const allSelected = group.options.every((o) =>
              filters.selectedPrograms.includes(o.value)
            );
            return (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">
                    {group.label}
                  </span>
                  <button
                    onClick={() => selectAllInGroup(group.key)}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((opt) => {
                    const active = filters.selectedPrograms.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleProgram(opt.value)}
                        className={clsx(
                          "text-sm px-2.5 py-1 rounded-full border transition",
                          active
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        )}
                      >
                        {opt.label}
                        <span
                          className={clsx(
                            "ml-1",
                            active ? "text-blue-200" : "text-gray-400"
                          )}
                        >
                          {opt.ageLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
