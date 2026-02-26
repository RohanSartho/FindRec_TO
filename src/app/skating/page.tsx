"use client";

import { useEffect, useState, useCallback } from "react";
import { RinkCard } from "@/components/rinks/RinkCard";
import { MapPin, ChevronDown, Loader2 } from "lucide-react";

const DISTRICTS = [
  { value: "", label: "All Toronto" },
  { value: "Etobicoke York", label: "Etobicoke & York" },
  { value: "North York", label: "North York" },
  { value: "Scarborough", label: "Scarborough" },
  { value: "Toronto and East York", label: "Toronto & East York" },
];

type RinkType = "all" | "indoor" | "outdoor";

export default function SkatingPage() {
  const [rinks, setRinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [district, setDistrict] = useState("");
  const [rinkType, setRinkType] = useState<RinkType>("all");
  const [isNearMe, setIsNearMe] = useState(false);

  const fetchRinks = useCallback(async (options?: {
    lat?: number;
    lng?: number;
    district?: string;
    type?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.lat) params.set("lat", String(options.lat));
      if (options?.lng) params.set("lng", String(options.lng));
      if (options?.lat) params.set("radius", "5000");
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

  // Initial load and re-fetch on filter change
  useEffect(() => {
    fetchRinks({ type: rinkType, district });
  }, [rinkType, district, fetchRinks]);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsNearMe(true);
        setDistrict("");
        fetchRinks({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          type: rinkType,
        });
        setGeoLoading(false);
      },
      () => {
        alert("Unable to get your location. Please check your browser permissions.");
        setGeoLoading(false);
      }
    );
  };

  const handleDistrictChange = (value: string) => {
    setIsNearMe(false);
    setDistrict(value);
  };

  const handleTypeChange = (type: RinkType) => {
    setRinkType(type);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Skating in Toronto</h1>
        <p className="text-gray-500">
          {rinks.length > 0
            ? `${rinks.length} rink${rinks.length !== 1 ? "s" : ""} found`
            : "Find outdoor and indoor ice rinks across Toronto"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8 items-center">
        {/* Near Me button */}
        <button
          onClick={handleNearMe}
          disabled={geoLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${
            isNearMe
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600"
          }`}
        >
          {geoLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <MapPin size={14} />
          )}
          Near Me
        </button>

        {/* District dropdown */}
        <div className="relative">
          <select
            value={district}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {DISTRICTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>

        {/* Type toggle */}
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
          {(["all", "indoor", "outdoor"] as RinkType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-4 py-2 text-sm font-medium capitalize transition ${
                rinkType === type
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="text-center py-24 text-red-500">{error}</div>
      ) : rinks.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg font-medium mb-1">No rinks found</p>
          <p className="text-sm">Try adjusting your filters or expanding your search area.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rinks.map((rink) => (
            <RinkCard key={rink.asset_id} rink={rink} />
          ))}
        </div>
      )}
    </div>
  );
}
