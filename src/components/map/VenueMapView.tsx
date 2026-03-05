"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { activityTypeColor } from "@/lib/utils/timetable";
import type { Venue } from "@/components/venues/VenueCard";

const TORONTO_CENTER = { longitude: -79.38, latitude: 43.70, zoom: 11 };

interface VenueMapViewProps {
  venues: Venue[];
  userLat?: number | null;
  userLng?: number | null;
  activeActivity?: string;
  activeSubActivity?: string;
}

export function VenueMapView({ venues, userLat, userLng, activeActivity, activeSubActivity }: VenueMapViewProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mapRef = useRef<MapRef>(null);

  const pins = venues.filter(
    (v): v is Venue & { lat: number; lng: number } =>
      v.lat != null && v.lng != null
  );

  const selected = pins.find((p) => p.id === selectedId) ?? null;

  const handleMarkerClick = useCallback((id: number, e: { originalEvent: { stopPropagation: () => void } }) => {
    e.originalEvent.stopPropagation();
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  // Fly to user location when Near Me is activated while map is visible
  useEffect(() => {
    if (userLat && userLng && mapRef.current) {
      mapRef.current.flyTo({ center: [userLng, userLat], zoom: 13, duration: 1200 });
    }
  }, [userLat, userLng]);

  const initialViewState = (userLat && userLng)
    ? { longitude: userLng, latitude: userLat, zoom: 13 }
    : TORONTO_CENTER;

  return (
    <div className="w-4/5 mx-auto h-[480px] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={() => setSelectedId(null)}
      >
        <NavigationControl position="top-right" />

        {/* User location dot */}
        {userLat && userLng && (
          <Marker longitude={userLng} latitude={userLat} anchor="center">
            <div className="relative flex items-center justify-center w-6 h-6">
              <div className="absolute w-6 h-6 rounded-full bg-blue-400 opacity-40 animate-ping" />
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md" />
            </div>
          </Marker>
        )}

        {pins.map((venue) => (
          <Marker
            key={venue.id}
            longitude={venue.lng}
            latitude={venue.lat}
            anchor="bottom"
            onClick={(e) => handleMarkerClick(venue.id, e)}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-125 ${
                selectedId === venue.id ? "scale-125 bg-brand" : "bg-brand/80"
              }`}
              title={venue.name}
            />
          </Marker>
        ))}

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="top"
            onClose={() => setSelectedId(null)}
            closeButton
            closeOnClick={false}
            maxWidth="260px"
            offset={12}
          >
            <div className="p-1 space-y-1.5">
              <h3
                className="font-semibold text-gray-900 text-sm leading-tight"
                style={{ fontFamily: "var(--font-fraunces), serif" }}
              >
                {selected.name}
              </h3>
              {selected.address && (
                <div className="flex items-start gap-1 text-xs text-gray-500">
                  <MapPin size={11} className="shrink-0 mt-0.5" />
                  <span>{selected.address}</span>
                </div>
              )}
              {selected.activity_types.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selected.activity_types.map((type) => (
                    <span
                      key={type}
                      className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${activityTypeColor(type)}`}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              )}
              <Link
                href={(() => {
                  if (activeActivity === "skating" && selected.rink) {
                    return `/skating/${selected.rink.asset_id}`;
                  }
                  const params = new URLSearchParams();
                  if (activeActivity)    params.set("activity", activeActivity);
                  if (activeSubActivity) params.set("sub", activeSubActivity);
                  const qs = params.toString();
                  return qs ? `/venues/${selected.id}?${qs}` : `/venues/${selected.id}`;
                })()}
                className="inline-block text-xs text-brand font-medium hover:underline pt-0.5"
              >
                View schedule →
              </Link>
            </div>
          </Popup>
        )}
      </Map>

      {pins.length < venues.length && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Showing <strong className="mx-0.5">{pins.length}</strong> of <strong className="mx-0.5">{venues.length}</strong> venues —{" "}
          {venues.length - pins.length} {venues.length - pins.length === 1 ? "venue has" : "venues have"} no recorded coordinates and won&apos;t appear on the map. Switch to Grid or List to see all.
        </div>
      )}
    </div>
  );
}
