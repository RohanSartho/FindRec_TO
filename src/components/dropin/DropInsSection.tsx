"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, List, Map as MapIcon } from "lucide-react";
import posthog from "posthog-js";
import { DropInFilterPanel, DropInFilters } from "./DropInFilterPanel";
import { DropInResultsTable } from "./DropInResultsTable";
import { DropInMapView } from "@/components/map/DropInMapView";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { DROPIN_FILTER_OPTIONS } from "@/lib/config/dropinFilters";

const VIEW_OPTIONS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "map"  as const, label: "Map",  icon: MapIcon },
];

function buildReturnTo(f: DropInFilters): string {
  const p = new URLSearchParams({ tab: "dropins", date: f.date });
  if (f.activityType) p.set("activity",  f.activityType);
  if (f.subActivity)  p.set("sub",       f.subActivity);
  if (f.ageCategory)  p.set("age",       f.ageCategory);
  if (f.district)     p.set("district",  f.district);
  if (f.venueSearch)  p.set("vsearch",   f.venueSearch);
  if (f.query)        p.set("dq",        f.query);
  if (f.timeFrom)     p.set("timeFrom",  f.timeFrom);
  if (f.timeTo)       p.set("timeTo",    f.timeTo);
  return `/activities?${p.toString()}`;
}

export function DropInsSection() {
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<DropInFilters>(() => ({
    date:             searchParams.get("date")     ?? new Date().toISOString().split("T")[0],
    activityType:     searchParams.get("activity") ?? "",
    subActivity:      searchParams.get("sub")      ?? "",
    selectedPrograms: ["leisure-all", "leisure-adult"],
    ageCategory:      searchParams.get("age")      ?? "",
    district:         searchParams.get("district") ?? "",
    venueSearch:      searchParams.get("vsearch")  ?? "",
    lat: null, lng: null, radiusKm: "5", isNearMe: false,
    timeFrom: searchParams.get("timeFrom") ?? "",
    timeTo:   searchParams.get("timeTo")   ?? "",
    query:    searchParams.get("dq")       ?? "",
  }));
  const [results, setResults] = useState<{ groups: any[]; total: number; date: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewStyle, setViewStyle] = useState<"list" | "map">("list");
  const [searchTrigger, setSearchTrigger] = useState(0);

  // ── Dynamic search state ─────────────────────────────────────────────────
  // searchDone: becomes true after the user's first explicit "Find Drop-ins" click.
  // All auto-search behaviour is gated on this — cold state is always explicit-click only.
  const [searchDone, setSearchDone] = useState(false);

  // filtersDirty: true when filters have changed since the last search completed.
  // Drives the Find button pulse and "Update Results" label in warm state.
  const [filtersDirty, setFiltersDirty] = useState(false);

  // Refs so effects always call the latest version without stale closures
  const searchDoneRef = useRef(false);
  const searchRef = useRef<() => void>(() => {});

  // Keep refs in sync with state/callback
  useEffect(() => { searchDoneRef.current = searchDone; }, [searchDone]);

  const search = useCallback(async () => {
    // Mark warm and clear dirty immediately so button enters "Searching..." state
    setSearchDone(true);
    setFiltersDirty(false);
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: filters.date });
      const isNonSkating = filters.activityType && filters.activityType !== "skating";
      if (isNonSkating) {
        params.set("activity_type", filters.activityType);
        if (filters.subActivity) params.set("sub_activity", filters.subActivity);
      } else if (filters.selectedPrograms.length > 0) {
        const titles = filters.selectedPrograms
          .flatMap((key) => DROPIN_FILTER_OPTIONS.find((o) => o.value === key)?.courseTitles ?? []);
        if (titles.length > 0) params.set("program_types", titles.join(","));
      }
      if (filters.isNearMe && filters.lat && filters.lng) {
        params.set("lat", String(filters.lat));
        params.set("lng", String(filters.lng));
        params.set("radius_km", filters.radiusKm);
      } else if (filters.district) {
        params.set("district", filters.district);
      } else if (filters.venueSearch) {
        params.set("venue_search", filters.venueSearch);
      }
      if (filters.ageCategory) params.set("age_category", filters.ageCategory);
      if (filters.query) params.set("q", filters.query);
      if (filters.timeFrom) params.set("time_start", filters.timeFrom + ":00");
      if (filters.timeTo)   params.set("time_end",   filters.timeTo   + ":00");

      const json = await fetch(`/api/dropin-search?${params}`).then((r) => r.json());
      setResults(json.data);
      setSearchTrigger((k) => k + 1);

      const eventProps = {
        activity_type:  filters.activityType || null,
        sub_activity:   filters.subActivity   || null,
        date:           filters.date,
        time_of_day:    filters.timeFrom || filters.timeTo ? "custom" : null,
        location_mode:  filters.isNearMe ? "near_me" : filters.district ? "district" : "none",
        district:       filters.district || null,
      };
      posthog.capture("dropin_search", eventProps);
      if ((json.data?.total ?? 0) === 0) posthog.capture("dropin_search_empty", eventProps);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Keep searchRef current so the auto-search effect always calls the latest version
  useEffect(() => { searchRef.current = search; }, [search]);

  // ── Auto-search on filter changes (warm state only) ──────────────────────
  // Fires when any discrete filter field changes AFTER the first explicit search.
  // Text inputs (venueSearch, query) are intentionally excluded — they require Enter.
  // Declared after searchRef update effect so searchRef is fresh when this fires.
  useEffect(() => {
    if (!searchDoneRef.current) return;
    searchRef.current();
    // Deps are all discrete filter fields that should auto-search.
    // searchDone/searchDoneRef intentionally excluded — we read via ref to avoid stale closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.date,
    filters.activityType,
    filters.subActivity,
    filters.selectedPrograms, // new array reference on every chip toggle
    filters.ageCategory,
    filters.timeFrom,
    filters.timeTo,
    filters.isNearMe,
    filters.lat,
    filters.lng,
    filters.district,
    filters.radiusKm,
  ]);

  // ── Filter change wrapper ────────────────────────────────────────────────
  // Marks filtersDirty when the user changes any filter after the first search.
  // Text inputs are included here (they dirty the button), but won't auto-search.
  const handleFilterChange = useCallback((newFilters: DropInFilters) => {
    setFilters(newFilters);
    if (searchDoneRef.current) setFiltersDirty(true);
  }, []); // stable — only reads ref, calls state setters

  // ── Back-nav auto-search ─────────────────────────────────────────────────
  const autoSearchDone = useRef(false);
  React.useEffect(() => {
    if (!autoSearchDone.current && searchParams.get("tab") === "dropins") {
      autoSearchDone.current = true;
      search();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      <div className="lg:sticky lg:top-20 lg:overflow-y-auto lg:max-h-[calc(100vh-9rem)]">
        <DropInFilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onSearch={search}
          loading={loading}
          searchDone={searchDone}
          filtersDirty={filtersDirty}
        />
      </div>

      <div>
        {results === null ? (
          <div className="text-center py-24 text-gray-400">
            <CalendarDays size={32} className="mx-auto mb-3 text-brand/40" />
            <p className="text-lg font-medium mb-1">Find drop-in skating sessions</p>
            <p className="text-sm">Choose your filters and tap &ldquo;Find Drop-ins&rdquo; to see what&apos;s on.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-3">
              <ViewToggle options={VIEW_OPTIONS} value={viewStyle} onChange={setViewStyle} />
            </div>
            {/* Dim results while an auto-search refresh is in progress */}
            <div className={loading ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
              {viewStyle === "map" ? (
                <DropInMapView
                  groups={results.groups}
                  userLat={filters.isNearMe ? filters.lat : null}
                  userLng={filters.isNearMe ? filters.lng : null}
                  returnTo={buildReturnTo(filters)}
                />
              ) : (
                <DropInResultsTable
                  groups={results.groups}
                  total={results.total}
                  date={results.date}
                  returnTo={buildReturnTo(filters)}
                  searchTrigger={searchTrigger}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
