"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, ChevronDown, Loader2, X, LayoutGrid, List, Map as MapIcon, Search } from "lucide-react";
import posthog from "posthog-js";
import { VenueCard, Venue } from "./VenueCard";
import { VenueMapView } from "@/components/map/VenueMapView";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useNearMe } from "@/lib/hooks/useNearMe";
import { DISTRICTS, RADIUS_OPTIONS, ACTIVITY_FILTER_OPTIONS, SUB_ACTIVITY_MAP } from "@/lib/config/dropinFilters";
import clsx from "clsx";

type ViewStyle = "grid" | "list" | "map";
type RinkTypeFilter = "" | "indoor" | "outdoor";

const VIEW_OPTIONS = [
  { id: "map"  as const, label: "Map",  icon: MapIcon   },
  { id: "grid" as const, label: "Grid", icon: LayoutGrid },
  { id: "list" as const, label: "List", icon: List       },
];

export function VenuesSection() {
  const searchParams = useSearchParams();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
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
  const abortRef = useRef<AbortController | null>(null);

  const fetchVenues = useCallback(async (options?: {
    lat?: number; lng?: number; district?: string;
    activityType?: string; subActivity?: string; rinkType?: string; radius?: number;
  }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.lat)          params.set("lat",           String(options.lat));
      if (options?.lng)          params.set("lng",           String(options.lng));
      if (options?.lat)          params.set("radius",        String(options.radius ?? 5000));
      if (options?.district)     params.set("district",      options.district);
      if (options?.activityType) params.set("activity_type", options.activityType);
      if (options?.subActivity)  params.set("sub_activity",  options.subActivity);
      if (options?.rinkType)     params.set("rink_type",     options.rinkType);
      const res  = await fetch(`/api/venues?${params}`, { signal: controller.signal });
      const json = await res.json();
      setVenues(json.data ?? []);
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") setError("Failed to load venues. Please try again.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isNearMe && nearMeLat && nearMeLng) {
      fetchVenues({ lat: nearMeLat, lng: nearMeLng, activityType: activityFilter || undefined, subActivity: subActivityFilter || undefined, rinkType: rinkTypeFilter || undefined, radius: parseInt(nearMeRadius) * 1000 });
    } else if (!isNearMe) {
      fetchVenues({ district: district || undefined, activityType: activityFilter || undefined, subActivity: subActivityFilter || undefined, rinkType: rinkTypeFilter || undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityFilter, subActivityFilter, rinkTypeFilter, district, isNearMe, nearMeLat, nearMeLng, nearMeRadius, fetchVenues]);

  const { loading: geoLoading, request: requestNearMe } = useNearMe();

  const handleNearMe = () => {
    posthog.capture("map_near_me_click", { tab: "venues" });
    requestNearMe((lat, lng) => {
      setIsNearMe(true);
      setNearMeLat(lat);
      setNearMeLng(lng);
      setDistrict("");
    });
  };

  const clearNearMe = () => { setIsNearMe(false); setNearMeLat(null); setNearMeLng(null); };

  const handleActivityChange = (value: string) => {
    setActivityFilter(value);
    setSubActivityFilter("");
    setRinkTypeFilter("");
    if (value) posthog.capture("venues_filter_applied", { activity_type: value, sub_activity: null, view_mode: viewStyle });
  };

  const handleDistrictChange = (value: string) => {
    setIsNearMe(false);
    setNearMeLat(null);
    setNearMeLng(null);
    setDistrict(value);
  };

  const filteredVenues = useMemo(() =>
    !nameSearch ? venues : venues.filter((v) => v.name.toLowerCase().includes(nameSearch.toLowerCase())),
    [venues, nameSearch]
  );

  return (
    <>
      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-8 items-center">
        {isNearMe ? (
          <>
            <div className="flex items-center gap-1.5 bg-brand text-white px-3 py-2 rounded-xl text-sm font-medium">
              <MapPin size={14} />
              <span>Near Me</span>
              <button onClick={clearNearMe} className="ml-1 hover:text-white/70 transition" aria-label="Clear Near Me">
                <X size={13} />
              </button>
            </div>
            <div className="relative">
              <select
                value={nearMeRadius}
                onChange={(e) => setNearMeRadius(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
              >
                {RADIUS_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
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
            <div className="relative">
              <select
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="appearance-none bg-white border rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer animate-filter-pulse max-w-[116px]"
              >
                {DISTRICTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </>
        )}

        <div className="relative">
          <select
            value={rinkTypeFilter}
            onChange={(e) => setRinkTypeFilter(e.target.value as RinkTypeFilter)}
            className="appearance-none bg-white border rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer animate-filter-pulse max-w-[95px]"
          >
            <option value="">All Venues</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={activityFilter}
            onChange={(e) => handleActivityChange(e.target.value)}
            className="appearance-none bg-white border rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer animate-filter-pulse"
          >
            {ACTIVITY_FILTER_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {activityFilter && SUB_ACTIVITY_MAP[activityFilter] && (
          <div className="relative">
            <select
              value={subActivityFilter}
              onChange={(e) => setSubActivityFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
            >
              <option value="">All {ACTIVITY_FILTER_OPTIONS.find((a) => a.value === activityFilter)?.label}</option>
              {SUB_ACTIVITY_MAP[activityFilter].map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}

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

        <div className="ml-auto">
          <ViewToggle
            options={VIEW_OPTIONS}
            value={viewStyle}
            onChange={(v) => { posthog.capture("venues_view_toggle", { view_mode: v }); setViewStyle(v); }}
          />
        </div>
      </div>

      {/* Results */}
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
          activeActivity={activityFilter || undefined}
          activeSubActivity={subActivityFilter || undefined}
        />
      ) : (
        <div className={clsx(
          "grid gap-4",
          viewStyle === "grid"
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-2 gap-1.5"
        )}>
          {filteredVenues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              compact={viewStyle === "list"}
              activeActivity={activityFilter || undefined}
              activeSubActivity={subActivityFilter || undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}
