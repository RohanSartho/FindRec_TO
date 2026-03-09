"use client";

import React, { useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, List, Map as MapIcon } from "lucide-react";
import posthog from "posthog-js";
import { ProgramsFilterPanel, ProgramFilters } from "./ProgramsFilterPanel";
import { ProgramsResultsTable } from "./ProgramsResultsTable";
import { ProgramsMapView } from "@/components/map/ProgramsMapView";
import { ViewToggle } from "@/components/ui/ViewToggle";

const VIEW_OPTIONS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "map"  as const, label: "Map",  icon: MapIcon },
];

function buildReturnTo(f: ProgramFilters): string {
  const p = new URLSearchParams({ tab: "programs", pdate_from: f.dateFrom, pdate_to: f.dateTo });
  if (f.timeOfDay)    p.set("ptime",     f.timeOfDay);
  if (f.activityType) p.set("pactivity", f.activityType);
  if (f.subActivity)  p.set("psub",      f.subActivity);
  if (f.district)     p.set("pdistrict", f.district);
  if (f.venueSearch)  p.set("pvsearch",  f.venueSearch);
  if (f.ageCategory)  p.set("page",      f.ageCategory);
  if (f.query)        p.set("pq",        f.query);
  return `/activities?${p.toString()}`;
}

function defaultDateTo(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export function ProgramsSection() {
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<ProgramFilters>({
    dateFrom:     searchParams.get("pdate_from") ?? new Date().toISOString().split("T")[0],
    dateTo:       searchParams.get("pdate_to")   ?? defaultDateTo(),
    timeOfDay:    searchParams.get("ptime")      ?? "",
    activityType: searchParams.get("pactivity")  ?? "",
    subActivity:  searchParams.get("psub")       ?? "",
    district:     searchParams.get("pdistrict")  ?? "",
    lat: null, lng: null, radiusKm: "5", isNearMe: false,
    venueSearch:  searchParams.get("pvsearch")   ?? "",
    ageCategory:  searchParams.get("page")       ?? "",
    query:        searchParams.get("pq")         ?? "",
  });
  const [results, setResults] = useState<{ programs: any[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewStyle, setViewStyle] = useState<"list" | "map">("list");
  const [searchTrigger, setSearchTrigger] = useState(0);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date_from: filters.dateFrom, date_to: filters.dateTo });
      if (filters.timeOfDay)    params.set("time_of_day",   filters.timeOfDay);
      if (filters.activityType) params.set("activity_type", filters.activityType);
      if (filters.subActivity)  params.set("sub_activity",  filters.subActivity);
      if (filters.ageCategory)  params.set("age_category",  filters.ageCategory);
      if (filters.query)        params.set("q",             filters.query);
      if (filters.isNearMe && filters.lat && filters.lng) {
        params.set("lat", String(filters.lat));
        params.set("lng", String(filters.lng));
        params.set("radius_km", filters.radiusKm);
      } else if (filters.district) {
        params.set("district",    filters.district);
      } else if (filters.venueSearch) {
        params.set("venue_search", filters.venueSearch);
      }
      const json = await fetch(`/api/programs-search?${params}`).then((r) => r.json());
      setResults(json.data);
      setSearchTrigger((k) => k + 1);

      const eventProps = {
        activity_type:  filters.activityType || null,
        sub_activity:   filters.subActivity  || null,
        date_from:      filters.dateFrom,
        date_to:        filters.dateTo,
        time_of_day:    filters.timeOfDay    || null,
        age_category:   filters.ageCategory  || null,
        location_mode:  filters.isNearMe ? "near_me" : filters.district ? "district" : "none",
        district:       filters.district     || null,
        query:          filters.query        || null,
      };
      posthog.capture("programs_search", eventProps);
      if ((json.data?.total ?? 0) === 0) posthog.capture("programs_search_empty", eventProps);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const autoSearchDone = useRef(false);
  React.useEffect(() => {
    if (!autoSearchDone.current && searchParams.get("tab") === "programs") {
      autoSearchDone.current = true;
      search();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const returnTo = buildReturnTo(filters);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      <div className="lg:sticky lg:top-20 lg:overflow-y-auto lg:max-h-[calc(100vh-9rem)]">
        <ProgramsFilterPanel filters={filters} onChange={setFilters} onSearch={search} loading={loading} />
      </div>

      <div>
        {results === null ? (
          <div className="text-center py-24 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4 mx-auto">
              <BookOpen size={24} className="text-brand" />
            </div>
            <p className="text-lg font-medium mb-1">Find registered programs</p>
            <p className="text-sm">Choose your filters and tap &ldquo;Find Programs&rdquo; to see what&apos;s available.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-3">
              <ViewToggle options={VIEW_OPTIONS} value={viewStyle} onChange={setViewStyle} />
            </div>
            {viewStyle === "map" ? (
              <ProgramsMapView
                programs={results.programs}
                userLat={filters.isNearMe ? filters.lat : null}
                userLng={filters.isNearMe ? filters.lng : null}
                returnTo={returnTo}
              />
            ) : (
              <ProgramsResultsTable
                programs={results.programs}
                total={results.total}
                returnTo={returnTo}
                searchTrigger={searchTrigger}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
