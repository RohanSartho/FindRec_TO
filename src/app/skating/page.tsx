"use client";

import { useEffect, useState, useCallback } from "react";
import { RinkCard } from "@/components/rinks/RinkCard";
import { RinkListItem } from "@/components/rinks/RinkListItem";
import { DropInFilterPanel, DropInFilters } from "@/components/dropin/DropInFilterPanel";
import { DropInResultsTable } from "@/components/dropin/DropInResultsTable";
import { MapPin, ChevronDown, Loader2, X, LayoutGrid, List, Search } from "lucide-react";
import { DISTRICTS, RADIUS_OPTIONS } from "@/lib/config/dropinFilters";
import clsx from "clsx";

type RinkType = "all" | "indoor" | "outdoor";
type PageMode = "rinks" | "dropins";
type ViewStyle = "grid" | "list";

export default function SkatingPage() {
  const [mode, setMode] = useState<PageMode>("rinks");

  // Rink finder state
  const [rinks, setRinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [district, setDistrict] = useState("");
  const [rinkType, setRinkType] = useState<RinkType>("all");
  const [isNearMe, setIsNearMe] = useState(false);
  const [nearMeLat, setNearMeLat] = useState<number | null>(null);
  const [nearMeLng, setNearMeLng] = useState<number | null>(null);
  const [nearMeRadius, setNearMeRadius] = useState("5");
  const [viewStyle, setViewStyle] = useState<ViewStyle>("grid");
  const [nameSearch, setNameSearch] = useState("");

  // Drop-in state
  const [dropinFilters, setDropinFilters] = useState<DropInFilters>({
    date: new Date().toISOString().split("T")[0],
    selectedPrograms: [],
    district: "",
    lat: null,
    lng: null,
    radiusKm: "5",
    isNearMe: false,
    timeSlot: "all",
  });
  const [dropinResults, setDropinResults] = useState<{
    groups: any[];
    total: number;
    date: string;
  } | null>(null);
  const [dropinLoading, setDropinLoading] = useState(false);

  const fetchRinks = useCallback(async (options?: {
    lat?: number;
    lng?: number;
    district?: string;
    type?: string;
    radius?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.lat) params.set("lat", String(options.lat));
      if (options?.lng) params.set("lng", String(options.lng));
      if (options?.lat) params.set("radius", String(options?.radius ?? 5000));
      if (options?.district) params.set("district", options.district);
      if (options?.type && options.type !== "all") params.set("type", options.type);

      const res = await fetch(`/api/rinks?${params.toString()}`);
      const json = await res.json();
      setRinks(json.data ?? []);
    } catch {
      setError("Failed to load rinks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on type/district changes (near me handled explicitly in handlers)
  useEffect(() => {
    if (!isNearMe) {
      fetchRinks({ type: rinkType, district });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rinkType, district, fetchRinks]);

  const searchDropins = useCallback(async () => {
    setDropinLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("date", dropinFilters.date);
      if (dropinFilters.selectedPrograms.length > 0) {
        params.set("program_types", dropinFilters.selectedPrograms.join(","));
      }
      if (dropinFilters.isNearMe && dropinFilters.lat && dropinFilters.lng) {
        params.set("lat", String(dropinFilters.lat));
        params.set("lng", String(dropinFilters.lng));
        params.set("radius_km", dropinFilters.radiusKm);
      } else if (dropinFilters.district) {
        params.set("district", dropinFilters.district);
      }
      // Time slot filter
      const timeRanges: Record<string, { start: string; end: string } | null> = {
        all: null,
        morning: { start: "06:00:00", end: "12:00:00" },
        afternoon: { start: "12:00:00", end: "17:00:00" },
        evening: { start: "17:00:00", end: "23:59:59" },
      };
      const timeRange = timeRanges[dropinFilters.timeSlot];
      if (timeRange) {
        params.set("time_start", timeRange.start);
        params.set("time_end", timeRange.end);
      }

      const res = await fetch(`/api/dropin-search?${params.toString()}`);
      const json = await res.json();
      setDropinResults(json.data);
    } finally {
      setDropinLoading(false);
    }
  }, [dropinFilters]);

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
        fetchRinks({ lat, lng, type: rinkType, radius: parseInt(nearMeRadius) * 1000 });
      },
      () => {
        alert("Unable to get your location. Please check your browser permissions.");
        setGeoLoading(false);
      }
    );
  };

  const clearNearMe = () => {
    setIsNearMe(false);
    setNearMeLat(null);
    setNearMeLng(null);
    fetchRinks({ type: rinkType, district });
  };

  const handleRadiusChange = (radius: string) => {
    setNearMeRadius(radius);
    if (nearMeLat && nearMeLng) {
      fetchRinks({ lat: nearMeLat, lng: nearMeLng, type: rinkType, radius: parseInt(radius) * 1000 });
    }
  };

  const handleDistrictChange = (value: string) => {
    setIsNearMe(false);
    setNearMeLat(null);
    setNearMeLng(null);
    setDistrict(value);
  };

  // Client-side name filter + sort
  const sortedRinks = (isNearMe
    ? rinks
    : [...rinks].sort((a, b) => {
        const nameA = (a.public_name || a.asset_name || "").toLowerCase();
        const nameB = (b.public_name || b.asset_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      })
  ).filter((r) =>
    !nameSearch || (r.public_name || r.asset_name || "").toLowerCase().includes(nameSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Skating in Toronto</h1>
        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-xl overflow-hidden w-fit">
          <button
            onClick={() => setMode("rinks")}
            className={`px-5 py-2.5 text-sm font-medium transition ${
              mode === "rinks" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            Find Rinks
          </button>
          <button
            onClick={() => setMode("dropins")}
            className={`px-5 py-2.5 text-sm font-medium transition ${
              mode === "dropins" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            Drop-ins Today
          </button>
        </div>
      </div>

      {mode === "rinks" ? (
        <>
          {/* Filters row */}
          <div className="flex flex-wrap gap-3 mb-8 items-center">
            {/* Near Me: active state with X + radius; inactive state with button */}
            {isNearMe ? (
              <>
                <div className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium">
                  <MapPin size={14} />
                  <span>Near Me</span>
                  <button
                    onClick={clearNearMe}
                    className="ml-1 hover:text-blue-200 transition"
                    aria-label="Clear Near Me"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={nearMeRadius}
                    onChange={(e) => handleRadiusChange(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-7 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                >
                  {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                  Near Me
                </button>

                <div className="relative">
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </>
            )}

            {/* Rink type toggle */}
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
              {(["all", "indoor", "outdoor"] as RinkType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setRinkType(type)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition ${
                    rinkType === type ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Name search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                placeholder="Search by name…"
                className="border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>

            {/* Grid / List toggle */}
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden ml-auto">
              <button
                onClick={() => setViewStyle("grid")}
                className={clsx("p-2 transition", viewStyle === "grid" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50")}
                aria-label="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewStyle("list")}
                className={clsx("p-2 transition", viewStyle === "list" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50")}
                aria-label="List view"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Rink grid or list */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-center py-24 text-red-500">{error}</div>
          ) : sortedRinks.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-lg font-medium mb-1">No rinks found</p>
              <p className="text-sm">Try adjusting your filters or expanding your search area.</p>
            </div>
          ) : viewStyle === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedRinks.map((rink) => (
                <RinkCard key={rink.asset_id} rink={rink} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedRinks.map((rink) => (
                <RinkListItem key={rink.asset_id} rink={rink} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Drop-ins Today mode */
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
          <div className="lg:sticky lg:top-20 lg:overflow-y-auto lg:max-h-[calc(100vh-5rem)]">
            <DropInFilterPanel
              filters={dropinFilters}
              onChange={setDropinFilters}
              onSearch={searchDropins}
              loading={dropinLoading}
            />
          </div>
          <div>
            {dropinResults === null ? (
              <div className="text-center py-24 text-gray-400">
                <p className="text-lg font-medium mb-1">
                  Find drop-in skating sessions
                </p>
                <p className="text-sm">
                  Choose your filters and tap &ldquo;Find Drop-ins&rdquo; to see what&apos;s on.
                </p>
              </div>
            ) : (
              <DropInResultsTable
                groups={dropinResults.groups}
                total={dropinResults.total}
                date={dropinResults.date}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
