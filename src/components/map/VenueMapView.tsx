"use client";

import { useState, useCallback } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { activityTypeColor } from "@/lib/utils/timetable";
import type { Venue } from "@/components/venues/VenueCard";

const TORONTO_CENTER = { longitude: -79.38, latitude: 43.70, zoom: 11 };

export function VenueMapView({ venues }: { venues: Venue[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const pins = venues.filter(
    (v): v is Venue & { lat: number; lng: number } =>
      v.lat != null && v.lng != null
  );

  const selected = pins.find((p) => p.id === selectedId) ?? null;

  const handleMarkerClick = useCallback((id: number, e: { originalEvent: { stopPropagation: () => void } }) => {
    e.originalEvent.stopPropagation();
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="w-full h-[580px] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={TORONTO_CENTER}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={() => setSelectedId(null)}
      >
        <NavigationControl position="top-right" />

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
                href={
                  selected.rink
                    ? `/skating/${selected.rink.asset_id}`
                    : `/venues/${selected.id}`
                }
                className="inline-block text-xs text-brand font-medium hover:underline pt-0.5"
              >
                View schedule →
              </Link>
            </div>
          </Popup>
        )}
      </Map>

      {pins.length < venues.length && (
        <p className="text-xs text-gray-400 text-center mt-2">
          {venues.length - pins.length} venue{venues.length - pins.length !== 1 ? "s" : ""} not shown (no coordinates)
        </p>
      )}
    </div>
  );
}
