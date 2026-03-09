"use client";

import { useState } from "react";
import { Heart, MapPin, House, TreePine, Waves, Palette, Dumbbell, Snowflake, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import posthog from "posthog-js";

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  aquatics: Waves,
  arts:     Palette,
  fitness:  Dumbbell,
  skating:  Snowflake,
  sports:   Trophy,
};
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
  venue_type: "indoor" | "outdoor" | null;
  lat?: number | null;
  lng?: number | null;
}

/** Build the correct detail page href.
 *  - Only route to /skating/{asset_id} when the active filter is explicitly "skating".
 *  - All other cases → /venues/{id}?activity=…&sub=… (preserves filter context).
 */
function venueHref(venue: Venue, activeActivity?: string, activeSubActivity?: string): string {
  if (activeActivity === "skating" && venue.rink) {
    return `/skating/${venue.rink.asset_id}`;
  }
  const params = new URLSearchParams();
  if (activeActivity)    params.set("activity", activeActivity);
  if (activeSubActivity) params.set("sub", activeSubActivity);
  const qs = params.toString();
  return qs ? `/venues/${venue.id}?${qs}` : `/venues/${venue.id}`;
}

export function VenueCard({
  venue, compact, activeActivity, activeSubActivity,
}: {
  venue: Venue;
  compact?: boolean;
  activeActivity?: string;
  activeSubActivity?: string;
}) {
  const { isFavourited, toggle, loading } = useFavourite(venue.id);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const href = venueHref(venue, activeActivity, activeSubActivity);

  const handleFavourite = async () => {
    const result = await toggle();
    if (result?.requiresAuth) setShowAuthModal(true);
  };

  if (compact) {
    const venueType = venue.rink ? venue.rink.rink_type : venue.venue_type;
    return (
      <>
        <div className="relative bg-white rounded-xl border border-gray-200 hover:border-brand hover:shadow-sm transition px-3 py-2 flex items-center gap-2.5">
          <Link href={href} className="absolute inset-0 rounded-xl z-10" aria-label={venue.name} />

          {/* Indoor/Outdoor dot */}
          {venueType && (
            <span
              className={clsx("shrink-0 w-2 h-2 rounded-full", venueType === "indoor" ? "bg-red-400" : "bg-green-400")}
              title={venueType === "indoor" ? "Indoor" : "Outdoor"}
            />
          )}

          {/* Name + address */}
          <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
            <p className="text-sm font-semibold text-gray-900 truncate">{venue.name}</p>
            {venue.address && (
              <p className="text-xs text-gray-400 truncate">{venue.address}</p>
            )}
          </div>

          {/* Activity icon chips (icon only, max 3) */}
          <div className="hidden sm:flex gap-1 shrink-0 relative z-20 pointer-events-none">
            {venue.activity_types.slice(0, 3).map((type) => {
              const Icon = ACTIVITY_ICONS[type];
              return Icon ? (
                <span key={type} className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${activityTypeColor(type)}`} title={type}>
                  <Icon size={10} />
                </span>
              ) : null;
            })}
          </div>

          {/* Favourite */}
          <button
            onClick={(e) => { e.stopPropagation(); handleFavourite(); }}
            disabled={loading}
            className="relative z-20 shrink-0 p-1 rounded-full hover:bg-gray-50 transition"
            aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart size={14} className={clsx("transition", isFavourited ? "fill-red-500 text-red-500" : "text-gray-300 hover:text-red-400")} />
          </button>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} message="Sign in to save your favourite venues." />
      </>
    );
  }

  return (
    <>
      <div className="relative bg-white rounded-2xl border-2 border-brand hover:shadow-md transition p-4 flex flex-col gap-3">
        {/* Full-card link overlay */}
        <Link
          href={href}
          className="absolute inset-0 rounded-2xl z-10"
          aria-label={venue.name}
          onClick={() => posthog.capture("venue_card_click", {
            location_id:   venue.id,
            location_name: venue.name,
            activity_type: activeActivity ?? null,
          })}
        />

        {/* Header row */}
        <div className="relative z-20 flex items-start justify-between gap-2 pointer-events-none">
          <div className="flex-1 min-w-0">
            {/* Indoor / Outdoor badge — rink takes priority, then venue_type */}
            {(venue.rink || venue.venue_type) && (() => {
              const type = venue.rink ? venue.rink.rink_type : venue.venue_type!;
              return (
                <div className={clsx(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-1.5",
                  type === "indoor" ? "bg-red-50 text-red-700" : "bg-green-100 text-green-700"
                )}>
                  {type === "indoor"
                    ? <House size={12} className="shrink-0" />
                    : <TreePine size={12} className="shrink-0" />
                  }
                  {type === "indoor" ? "Indoor" : "Outdoor"}
                </div>
              );
            })()}
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
            {venue.activity_types.map((type) => {
              const Icon = ACTIVITY_ICONS[type];
              return (
                <span
                  key={type}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full capitalize ${activityTypeColor(type)}`}
                >
                  {Icon && <Icon size={11} className="shrink-0" />}
                  {type}
                </span>
              );
            })}
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
