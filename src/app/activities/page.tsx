"use client";

import { useEffect, useState, useCallback } from "react";
import { VenueCard, Venue } from "@/components/venues/VenueCard";
import { DropInFilterPanel, DropInFilters } from "@/components/dropin/DropInFilterPanel";
import { DropInResultsTable } from "@/components/dropin/DropInResultsTable";
import {
  MapPin, ChevronDown, ChevronUp, Loader2,
  X, LayoutGrid, List, Search, Filter, Map as MapIcon,
} from "lucide-react";
import {
  DISTRICTS, RADIUS_OPTIONS, DROPIN_FILTER_OPTIONS, ACTIVITY_FILTER_OPTIONS, SUB_ACTIVITY_MAP,
} from "@/lib/config/dropinFilters";
import { VenueMapView } from "@/components/map/VenueMapView";
import { DropInMapView } from "@/components/map/DropInMapView";
import clsx from "clsx";

type PageMode = "venues" | "dropins";
type ViewStyle = "grid" | "list" | "map";
type RinkTypeFilter = "" | "indoor" | "outdoor";

// Activities that expose the Indoor / Outdoor sub-filter
const RINK_FILTER_ACTIVITIES = ["skating"];

export default function VenuesPage() {
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
  const [viewStyle, setViewStyle] = useState<ViewStyle>("grid");
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

  // ── fetchVenues ───────────────────────────────────────────────────────────
  const fetchVenues = useCallback(async (options?: {
    lat?: number;
    lng?: number;
    district?: string;
    activityType?: string;
    subActivity?: string;
    rinkType?: string;
    radius?: number;
  }) => {
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

      const res = await fetch(`/api/venues?${params.toString()}`);
      const json = await res.json();
      setVenues(json.data ?? []);
    } catch {
      setError("Failed to load venues. Please try again.");
    } finally {
      setLoading(false);
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

  // ── Geo handlers ──────────────────────────────────────────────────────────
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setIsNearMe(true);
        setNearMeLat(lat);
        setNearMeLng(lng);
        setDistrict("");
        setGeoLoading(false);
        fetchVenues({
          lat, lng,
          activityType: activityFilter || undefined,
          subActivity:  subActivityFilter || undefined,
          rinkType:     rinkTypeFilter || undefined,
          radius: parseInt(nearMeRadius) * 1000,
        });
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
    fetchVenues({
      district:     district          || undefined,
      activityType: activityFilter    || undefined,
      subActivity:  subActivityFilter || undefined,
      rinkType:     rinkTypeFilter    || undefined,
    });
  };

  const handleRadiusChange = (radius: string) => {
    setNearMeRadius(radius);
    if (nearMeLat && nearMeLng) {
      fetchVenues({
        lat: nearMeLat, lng: nearMeLng,
        activityType: activityFilter    || undefined,
        subActivity:  subActivityFilter || undefined,
        rinkType:     rinkTypeFilter    || undefined,
        radius: parseInt(radius) * 1000,
      });
    }
  };

  const handleDistrictChange = (value: string) => {
    setIsNearMe(false);
    setNearMeLat(null);
    setNearMeLng(null);
    setDistrict(value);
  };

  // Client-side name search (results are already sorted alphabetically by the API)
  const filteredVenues = venues.filter((v) =>
    !nameSearch || v.name.toLowerCase().includes(nameSearch.toLowerCase())
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
          Venues in Toronto
        </h1>

        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-xl overflow-hidden w-fit">
          <button
            onClick={() => setMode("venues")}
            className={`px-5 py-2.5 text-sm font-medium transition ${
              mode === "venues" ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            Find Venues
          </button>
          <button
            onClick={() => setMode("dropins")}
            className={`px-5 py-2.5 text-sm font-medium transition ${
              mode === "dropins" ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            Drop-ins Today
          </button>
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
                className="border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand w-44"
              />
            </div>

            {/* Grid / List / Map toggle */}
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden ml-auto">
              <button
                onClick={() => setViewStyle("grid")}
                className={clsx("p-2 transition", viewStyle === "grid" ? "bg-brand text-white" : "text-gray-500 hover:bg-gray-50")}
                aria-label="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewStyle("list")}
                className={clsx("p-2 transition", viewStyle === "list" ? "bg-brand text-white" : "text-gray-500 hover:bg-gray-50")}
                aria-label="List view"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewStyle("map")}
                className={clsx("p-2 transition", viewStyle === "map" ? "bg-brand text-white" : "text-gray-500 hover:bg-gray-50")}
                aria-label="Map view"
              >
                <MapIcon size={16} />
              </button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredVenues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── Drop-ins Today mode (unchanged) ──────────────────────────── */
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
