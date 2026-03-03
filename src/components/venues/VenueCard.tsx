"use client";

import { useState } from "react";
import { Heart, MapPin, Building2, TreePine } from "lucide-react";
import { AuthModal } from "@/components/ui/AuthModal";
import { useFavourite } from "@/lib/hooks/useFavourite";
import { activityTypeColor } from "@/lib/utils/timetable";
import Link from "next/link";
import clsx from "clsx";

export interface Venue {
  id: number;
  name: string;
  address: string | null;
  district: string | null;
  activity_types: string[];
  rink: { asset_id: number; rink_type: "indoor" | "outdoor" } | null;
}

export function VenueCard({ venue }: { venue: Venue }) {
  const { isFavourited, toggle, loading } = useFavourite(venue.id);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const href = venue.rink
    ? `/skating/${venue.rink.asset_id}`
    : `/venues/${venue.id}`;

  const handleFavourite = async () => {
    const result = await toggle();
    if (result?.requiresAuth) setShowAuthModal(true);
  };

  return (
    <>
      <div className="relative bg-white rounded-2xl border-2 border-brand hover:shadow-md transition p-4 flex flex-col gap-3">
        {/* Full-card link overlay */}
        <Link
          href={href}
          className="absolute inset-0 rounded-2xl z-10"
          aria-label={venue.name}
        />

        {/* Header row */}
        <div className="relative z-20 flex items-start justify-between gap-2 pointer-events-none">
          <div className="flex-1 min-w-0">
            {/* Rink type badge — only for venues with a rink */}
            {venue.rink && (
              <div className={clsx(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-1.5",
                venue.rink.rink_type === "indoor"
                  ? "bg-brand/10 text-brand"
                  : "bg-green-100 text-green-700"
              )}>
                {venue.rink.rink_type === "indoor"
                  ? <Building2 size={12} className="shrink-0" />
                  : <TreePine size={12} className="shrink-0" />
                }
                {venue.rink.rink_type === "indoor" ? "Indoor Rink" : "Outdoor Rink"}
              </div>
            )}
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
              {venue.name}
            </h3>
          </div>

          {/* Favourite button — pointer-events-auto overrides parent's none */}
          <button
            onClick={(e) => { e.stopPropagation(); handleFavourite(); }}
            disabled={loading}
            className="relative z-20 shrink-0 p-1.5 rounded-full hover:bg-gray-50 transition pointer-events-auto"
            aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart
              size={18}
              className={clsx(
                "transition",
                isFavourited ? "fill-red-500 text-red-500" : "text-gray-300 hover:text-red-400"
              )}
            />
          </button>
        </div>

        {/* Address */}
        {venue.address && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{venue.address}</span>
          </div>
        )}

        {/* Activity type chips */}
        {venue.activity_types.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {venue.activity_types.map((type) => (
              <span
                key={type}
                className={`text-xs px-2 py-0.5 rounded-full capitalize ${activityTypeColor(type)}`}
              >
                {type}
              </span>
            ))}
          </div>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Sign in to save your favourite venues."
      />
    </>
  );
}
