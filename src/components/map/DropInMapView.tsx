"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import MapGL, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { MapPin } from "lucide-react";
import posthog from "posthog-js";
import { formatTimeRange } from "@/lib/utils/timetable";

const TORONTO_CENTER = { longitude: -79.38, latitude: 43.70, zoom: 11 };

interface DropInSession {
  course_id: number;
  start_time: string;
  end_time: string;
  location_id: number;
  locations: {
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    rinks?: Array<{ asset_id: number }>;
  } | null;
}

interface Group {
  program_type: string;
  sessions: DropInSession[];
}

interface DropInPin {
  locationId: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  assetId: number | null;
  sessionSummaries: { programType: string; time: string }[];
}

interface DropInMapViewProps {
  groups: Group[];
  userLat?: number | null;
  userLng?: number | null;
  returnTo?: string;
}

export function DropInMapView({ groups, userLat, userLng, returnTo }: DropInMapViewProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mapRef = useRef<MapRef>(null);

  const pins = useMemo<DropInPin[]>(() => {
    const locMap = new Map<number, DropInPin>();
    for (const group of groups) {
      for (const session of group.sessions) {
        const loc = session.locations;
        if (!loc || loc.lat == null || loc.lng == null) continue;
        const id = session.location_id;
        if (!locMap.has(id)) {
          locMap.set(id, {
            locationId: id,
            name: loc.name,
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
            assetId: loc.rinks?.[0]?.asset_id ?? null,
            sessionSummaries: [],
          });
        }
        locMap.get(id)!.sessionSummaries.push({
          programType: group.program_type,
          time: formatTimeRange(session.start_time, session.end_time),
        });
      }
    }
    return Array.from(locMap.values());
  }, [groups]);

  const selected = pins.find((p) => p.locationId === selectedId) ?? null;

  const handleMarkerClick = useCallback((id: number, e: { originalEvent: { stopPropagation: () => void } }) => {
    e.originalEvent.stopPropagation();
    setSelectedId((prev) => {
      if (prev !== id) {
        const pin = pins.find((p) => p.locationId === id);
        posthog.capture("map_marker_click", { location_id: id, location_name: pin?.name ?? null });
      }
      return prev === id ? null : id;
    });
  }, [pins]);

  // Fly to user location when Near Me is active
  useEffect(() => {
    if (userLat && userLng && mapRef.current) {
      mapRef.current.flyTo({ center: [userLng, userLat], zoom: 13, duration: 1200 });
    }
  }, [userLat, userLng]);

  const initialViewState = (userLat && userLng)
    ? { longitude: userLng, latitude: userLat, zoom: 13 }
    : TORONTO_CENTER;

  if (pins.length === 0) {
    return (
      <div className="w-full h-[480px] rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400">
        <p className="text-sm">No locations with coordinates to show on map.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <MapGL
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

        {pins.map((pin) => (
          <Marker
            key={pin.locationId}
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="bottom"
            onClick={(e) => handleMarkerClick(pin.locationId, e)}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-125 ${
                selectedId === pin.locationId ? "scale-125 bg-brand" : "bg-brand/80"
              }`}
              title={pin.name}
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
            maxWidth="280px"
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
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {selected.sessionSummaries.map((s, i) => (
                  <div key={i} className="text-xs text-gray-700">
                    <span className="font-medium">{s.time}</span>
                    <span className="text-gray-400 ml-1">· {s.programType}</span>
                  </div>
                ))}
              </div>
              <Link
                href={`/venues/${selected.locationId}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                className="inline-block text-xs text-brand font-medium hover:underline pt-0.5"
              >
                View schedule →
              </Link>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
