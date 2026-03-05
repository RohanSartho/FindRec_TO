"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { VenueCard, Venue } from "@/components/venues/VenueCard";
import { DropInFilterPanel, DropInFilters } from "@/components/dropin/DropInFilterPanel";
import { DropInResultsTable } from "@/components/dropin/DropInResultsTable";
import {
  MapPin, ChevronDown, ChevronUp, Loader2,
  X, LayoutGrid, List, Search, Filter, Map as MapIcon,
  Building2, CalendarDays, BookOpen,
} from "lucide-react";
import {
  DISTRICTS, RADIUS_OPTIONS, DROPIN_FILTER_OPTIONS, ACTIVITY_FILTER_OPTIONS, SUB_ACTIVITY_MAP,
} from "@/lib/config/dropinFilters";
import { VenueMapView } from "@/components/map/VenueMapView";
import { DropInMapView } from "@/components/map/DropInMapView";
import clsx from "clsx";

type PageMode = "venues" | "dropins" | "programs";
type ViewStyle = "grid" | "list" | "map";
type RinkTypeFilter = "" | "indoor" | "outdoor";

// Activities that expose the Indoor / Outdoor sub-filter
const RINK_FILTER_ACTIVITIES = ["skating"];

function VenuesPageInner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<PageMode>("venues");

  // ── Venue finder state ────────────────────────────────────────────────────
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [district, setDistrict] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [subActivityFilter, setSubActivityFilter] = useState("");
  const [rinkTypeFilter, setRinkTypeFilter] = useState<RinkTypeFilter>("");
  const [isNearMe, setIsNearMe] = useState(false);
  const [nearMeLat, setNearMeLat] = useState<number | null>(null);
  const [nearMeLng, setNearMeLng] = useState<number | null>(null);
  const [nearMeRadius, setNearMeRadius] = useState("5");
  const [viewStyle, setViewStyle] = useState<ViewStyle>(() => {
    const v = searchParams.get("view");
    return v === "map" || v === "list" || v === "grid" ? v : "grid";
  });
  const [nameSearch, setNameSearch] = useState("");

  // ── Drop-in state ─────────────────────────────────────────────────────────
  const [dropinFilters, setDropinFilters] = useState<DropInFilters>({
    date: new Date().toISOString().split("T")[0],
    activityType: "",
    subActivity: "",
    selectedPrograms: [],
    district: "",
    lat: null,
    lng: null,
    radiusKm: "5",
    isNearMe: false,
    timeFrom: "",
    timeTo: "",
  });
  const [dropinResults, setDropinResults] = useState<{
    groups: any[];
    total: number;
    date: string;
  } | null>(null);
  const [dropinLoading, setDropinLoading] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [dropinViewStyle, setDropinViewStyle] = useState<"list" | "map">("list");

  // ── fetchVenues — AbortController cancels stale in-flight requests ────────
  const abortRef = useRef<AbortController | null>(null);

  const fetchVenues = useCallback(async (options?: {
    lat?: number;
    lng?: number;
    district?: string;
    activityType?: string;
    subActivity?: string;
    rinkType?: string;
    radius?: number;
  }) => {
    // Cancel any previous in-flight fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.lat)          params.set("lat",           String(options.lat));
      if (options?.lng)          params.set("lng",           String(options.lng));
      if (options?.lat)          params.set("radius",        String(options?.radius ?? 5000));
      if (options?.district)     params.set("district",      options.district);
      if (options?.activityType) params.set("activity_type", options.activityType);
      if (options?.subActivity)  params.set("sub_activity",  options.subActivity);
      if (options?.rinkType)     params.set("rink_type",     options.rinkType);

      const res = await fetch(`/api/venues?${params.toString()}`, { signal: controller.signal });
      const json = await res.json();
      setVenues(json.data ?? []);
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        setError("Failed to load venues. Please try again.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Re-fetch whenever filters change
  useEffect(() => {
    if (mode !== "venues") return;
    if (isNearMe && nearMeLat && nearMeLng) {
      fetchVenues({
        lat: nearMeLat,
        lng: nearMeLng,
        activityType: activityFilter || undefined,
        subActivity: subActivityFilter || undefined,
        rinkType: rinkTypeFilter || undefined,
        radius: parseInt(nearMeRadius) * 1000,
      });
    } else if (!isNearMe) {
      fetchVenues({
        district: district || undefined,
        activityType: activityFilter || undefined,
        subActivity: subActivityFilter || undefined,
        rinkType: rinkTypeFilter || undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityFilter, subActivityFilter, rinkTypeFilter, district, isNearMe, nearMeLat, nearMeLng, nearMeRadius, fetchVenues]);

  // ── Activity filter handler — reset sub-filters on parent change ────────────
  const handleActivityChange = (value: string) => {
    setActivityFilter(value);
    setSubActivityFilter(""); // reset sub-activity when parent changes
    setRinkTypeFilter("");    // rink-type only applies to skating
  };

  // ── Drop-in search ────────────────────────────────────────────────────────
  const searchDropins = useCallback(async () => {
    setDropinLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("date", dropinFilters.date);

      const isNonSkating = dropinFilters.activityType && dropinFilters.activityType !== "skating";
      if (isNonSkating) {
        // Non-skating: pass activity_type + optional sub_activity
        params.set("activity_type", dropinFilters.activityType);
        if (dropinFilters.subActivity) params.set("sub_activity", dropinFilters.subActivity);
      } else {
        // Skating (default): use program_types chip logic
        if (dropinFilters.selectedPrograms.length > 0) {
          const expanded = dropinFilters.selectedPrograms.flatMap((key) => {
            const opt = DROPIN_FILTER_OPTIONS.find((o) => o.value === key);
            return opt?.courseTitles ?? [];
          });
          if (expanded.length > 0) params.set("program_types", expanded.join(","));
        }
      }

      if (dropinFilters.isNearMe && dropinFilters.lat && dropinFilters.lng) {
        params.set("lat",       String(dropinFilters.lat));
        params.set("lng",       String(dropinFilters.lng));
        params.set("radius_km", dropinFilters.radiusKm);
      } else if (dropinFilters.district) {
        params.set("district", dropinFilters.district);
      }
      if (dropinFilters.timeFrom) params.set("time_start", dropinFilters.timeFrom + ":00");
      if (dropinFilters.timeTo)   params.set("time_end",   dropinFilters.timeTo   + ":00");

      const res = await fetch(`/api/dropin-search?${params.toString()}`);
      const json = await res.json();
      setDropinResults(json.data);
    } finally {
      setDropinLoading(false);
    }
  }, [dropinFilters]);

  // ── Geo handlers — only update state; useEffect drives the fetch ──────────
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsNearMe(true);
        setNearMeLat(pos.coords.latitude);
        setNearMeLng(pos.coords.longitude);
        setDistrict("");
        setGeoLoading(false);
        // useEffect will fire because nearMeLat/nearMeLng changed
      },
      (err) => {
        const msg = err.code === 1
          ? "Location access denied. Allow location in your browser settings and try again."
          : err.code === 3
          ? "Location request timed out. Try again."
          : "Unable to get your location.";
        alert(msg);
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const clearNearMe = () => {
    setIsNearMe(false);
    setNearMeLat(null);
    setNearMeLng(null);
    // useEffect will fire and fetch with district/activity filters
  };

  const handleRadiusChange = (radius: string) => {
    setNearMeRadius(radius);
    // useEffect will fire because nearMeRadius changed
  };

  const handleDistrictChange = (value: string) => {
    setIsNearMe(false);
    setNearMeLat(null);
    setNearMeLng(null);
    setDistrict(value);
  };

  // Client-side name search — memoised to avoid re-filtering on unrelated renders
  const filteredVenues = useMemo(() =>
    !nameSearch
      ? venues
      : venues.filter((v) => v.name.toLowerCase().includes(nameSearch.toLowerCase())),
    [venues, nameSearch]
  );

  const showRinkTypeFilter = RINK_FILTER_ACTIVITIES.includes(activityFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-4"
          style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
        >
          Find Community Centres &amp; Activities in Toronto
        </h1>

        {/* Mode tabs */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "venues",   label: "Community Centres",   icon: Building2 },
              { id: "dropins",  label: "Drop-in Activities",  icon: CalendarDays },
              { id: "programs", label: "Registered Programs", icon: BookOpen },
            ] as { id: PageMode; label: string; icon: React.ElementType }[]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition",
                mode === id
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand"
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "venues" ? (
        <>
          {/* ── Filters row ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 mb-8 items-center">

            {/* Near Me */}
            {isNearMe ? (
              <>
                <div className="flex items-center gap-1.5 bg-brand text-white px-3 py-2 rounded-xl text-sm font-medium">
                  <MapPin size={14} />
                  <span>Near Me</span>
                  <button
                    onClick={clearNearMe}
                    className="ml-1 hover:text-white/70 transition"
                    aria-label="Clear Near Me"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={nearMeRadius}
                    onChange={(e) => handleRadiusChange(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                  >
                    {RADIUS_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleNearMe}
                  disabled={geoLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition bg-white text-gray-700 border-gray-200 hover:border-brand hover:text-brand"
                >
                  {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                  Near Me
                </button>

                {/* District dropdown */}
                <div className="relative">
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </>
            )}

            {/* Activities dropdown */}
            <div className="relative">
              <select
                value={activityFilter}
                onChange={(e) => handleActivityChange(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
              >
                {ACTIVITY_FILTER_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Sub-activity dropdown — visible when any specific activity is selected and has sub-options */}
            {activityFilter && SUB_ACTIVITY_MAP[activityFilter] && (
              <div className="relative">
                <select
                  value={subActivityFilter}
                  onChange={(e) => setSubActivityFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                >
                  <option value="">All {ACTIVITY_FILTER_OPTIONS.find(a => a.value === activityFilter)?.label}</option>
                  {SUB_ACTIVITY_MAP[activityFilter].map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Indoor / Outdoor dropdown — only visible when skating is selected */}
            {showRinkTypeFilter && (
              <div className="relative">
                <select
                  value={rinkTypeFilter}
                  onChange={(e) => setRinkTypeFilter(e.target.value as RinkTypeFilter)}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                >
                  <option value="">All Rinks</option>
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Name search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                placeholder="Search by name…"
                className="border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand w-44 bg-white shadow-sm"
              />
            </div>

            {/* Map / Grid / List toggle */}
            <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm ml-auto">
              {(
                [
                  { id: "map",  label: "Map",  icon: MapIcon },
                  { id: "grid", label: "Grid", icon: LayoutGrid },
                  { id: "list", label: "List", icon: List },
                ] as { id: ViewStyle; label: string; icon: React.ElementType }[]
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setViewStyle(id)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition",
                    viewStyle === id ? "bg-brand text-white" : "text-gray-500 bg-white hover:bg-gray-50"
                  )}
                  aria-label={`${label} view`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Venue grid / list / map ────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-brand" />
            </div>
          ) : error ? (
            <div className="text-center py-24 text-red-500">{error}</div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-lg font-medium mb-1">No venues found</p>
              <p className="text-sm">Try adjusting your filters or expanding your search area.</p>
            </div>
          ) : viewStyle === "map" ? (
            <VenueMapView
            venues={filteredVenues}
            userLat={isNearMe ? nearMeLat : null}
            userLng={isNearMe ? nearMeLng : null}
          />
          ) : viewStyle === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredVenues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredVenues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} compact />
              ))}
            </div>
          )}
        </>
      ) : mode === "programs" ? (
        /* ── Registered Programs mode ─────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-brand" />
          </div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
          >
            Registered Programs
          </h2>
          <p className="text-gray-500 text-sm max-w-sm">
            Browse and search registered programs across Toronto community centres — swimming lessons, fitness classes, arts programs, and more.
          </p>
          <p className="mt-3 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
            Coming soon
          </p>
        </div>
      ) : (
        /* ── Drop-ins Today mode ───────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

          {/* Left: filter panel */}
          <div className="lg:sticky lg:top-20 lg:overflow-y-auto lg:max-h-[calc(100vh-9rem)]">
            <button
              onClick={() => setMobileFilterOpen((o) => !o)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 mb-3 bg-brand text-white rounded-xl font-medium text-sm"
            >
              <span className="flex items-center gap-2">
                <Filter size={15} />
                Filters
              </span>
              {mobileFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <div className={clsx("lg:block", mobileFilterOpen ? "block" : "hidden")}>
              <DropInFilterPanel
                filters={dropinFilters}
                onChange={setDropinFilters}
                onSearch={searchDropins}
                loading={dropinLoading}
              />
            </div>
          </div>

          {/* Right: results */}
          <div>
            {dropinResults === null ? (
              <div className="text-center py-24 text-gray-400">
                <p className="text-lg font-medium mb-1">Find drop-in skating sessions</p>
                <p className="text-sm">Choose your filters and tap &ldquo;Find Drop-ins&rdquo; to see what&apos;s on.</p>
              </div>
            ) : (
              <>
                {/* List / Map toggle */}
                <div className="flex justify-end mb-3">
                  <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setDropinViewStyle("list")}
                      className={clsx("p-2 transition", dropinViewStyle === "list" ? "bg-brand text-white" : "text-gray-500 hover:bg-gray-50")}
                      aria-label="List view"
                    >
                      <List size={16} />
                    </button>
                    <button
                      onClick={() => setDropinViewStyle("map")}
                      className={clsx("p-2 transition", dropinViewStyle === "map" ? "bg-brand text-white" : "text-gray-500 hover:bg-gray-50")}
                      aria-label="Map view"
                    >
                      <MapIcon size={16} />
                    </button>
                  </div>
                </div>

                {dropinViewStyle === "map" ? (
                  <DropInMapView
                    groups={dropinResults.groups}
                    userLat={dropinFilters.isNearMe ? dropinFilters.lat : null}
                    userLng={dropinFilters.isNearMe ? dropinFilters.lng : null}
                  />
                ) : (
                  <DropInResultsTable
                    groups={dropinResults.groups}
                    total={dropinResults.total}
                    date={dropinResults.date}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function VenuesPage() {
  return (
    <React.Suspense fallback={null}>
      <VenuesPageInner />
    </React.Suspense>
  );
}
