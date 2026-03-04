"use client";

import { useState } from "react";
import { Heart, MapPin, Building2, TreePine } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AuthModal } from "@/components/ui/AuthModal";
import { useFavourite } from "@/lib/hooks/useFavourite";
import Link from "next/link";
import clsx from "clsx";

interface RinkListItemProps {
  rink: {
    id: number;
    asset_id: number;
    asset_name: string;
    public_name: string | null;
    rink_type: "indoor" | "outdoor";
    operated_by: string | null;
    has_boards: boolean | null;
    location_id: number;
    locations: {
      name: string;
      address: string | null;
      district: string | null;
    } | null;
    rink_live_status?: Array<{
      status: string;
      reason: string | null;
      fetched_at: string;
    }>;
  };
}

export function RinkListItem({ rink }: RinkListItemProps) {
  const { isFavourited, toggle, loading } = useFavourite(rink.location_id);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const liveStatus = rink.rink_live_status
    ?.slice()
    .sort((a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime())[0];
  const status = (liveStatus?.status ?? "unknown") as "open" | "closed" | "service_alert" | "unknown";
  const displayName = rink.public_name || rink.asset_name;

  const handleFavourite = async () => {
    const result = await toggle();
    if (result?.requiresAuth) setShowAuthModal(true);
  };

  return (
    <>
      <div className="relative flex items-center gap-3 bg-white border-2 border-brand rounded-xl px-4 py-3 hover:shadow-sm transition">
        <Link
          href={`/skating/${rink.asset_id}`}
          className="absolute inset-0 rounded-xl z-10"
          aria-label={displayName}
        />

        {/* Type icon */}
        <div className={clsx(
          "shrink-0 p-2 rounded-full",
          rink.rink_type === "indoor" ? "bg-brand/10" : "bg-green-100"
        )}>
          {rink.rink_type === "indoor"
            ? <Building2 size={15} className="text-brand" />
            : <TreePine size={15} className="text-green-600" />
          }
        </div>

        {/* Name + address */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{displayName}</p>
          {rink.locations?.address && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{rink.locations.address}</span>
            </div>
          )}
        </div>

        {/* District */}
        {rink.locations?.district && (
          <span className="hidden lg:block text-xs text-gray-400 shrink-0 max-w-[140px] truncate">
            {rink.locations.district}
          </span>
        )}

        {/* Status badge */}
        {status !== "unknown" && (
          <div className="shrink-0 pointer-events-none relative z-20">
            <StatusBadge status={status} />
          </div>
        )}

        {/* Heart */}
        <button
          onClick={(e) => { e.stopPropagation(); handleFavourite(); }}
          disabled={loading}
          className="relative z-20 shrink-0 p-1.5 rounded-full hover:bg-gray-50 transition"
          aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
        >
          <Heart
            size={16}
            className={clsx(
              "transition",
              isFavourited ? "fill-red-500 text-red-500" : "text-gray-300 hover:text-red-400"
            )}
          />
        </button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Sign in to save your favourite rinks."
      />
    </>
  );
}
