"use client";

import { useState } from "react";
import { Heart, MapPin, Building2, TreePine } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AuthModal } from "@/components/ui/AuthModal";
import { useFavourite } from "@/lib/hooks/useFavourite";
import clsx from "clsx";

interface RinkCardProps {
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

export function RinkCard({ rink }: RinkCardProps) {
  const { isFavourited, toggle, loading } = useFavourite(rink.location_id);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const liveStatus = rink.rink_live_status?.[0];
  const status = (liveStatus?.status ?? "unknown") as "open" | "closed" | "service_alert" | "unknown";
  const displayName = rink.public_name || rink.asset_name;

  const handleFavourite = async () => {
    const result = await toggle();
    if (result?.requiresAuth) setShowAuthModal(true);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition p-4 flex flex-col gap-3 cursor-pointer"
        onClick={() => window.location.href = `/skating/${rink.asset_id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {rink.rink_type === "indoor" ? (
                <Building2 size={14} className="text-blue-500 shrink-0" />
              ) : (
                <TreePine size={14} className="text-green-500 shrink-0" />
              )}
              <span className="text-xs text-gray-500 capitalize">
                {rink.rink_type} rink
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
              {displayName}
            </h3>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleFavourite(); }}
            disabled={loading}
            className="shrink-0 p-1.5 rounded-full hover:bg-gray-50 transition"
            aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart
              size={18}
              className={clsx(
                "transition",
                isFavourited
                  ? "fill-red-500 text-red-500"
                  : "text-gray-300 hover:text-red-400"
              )}
            />
          </button>
        </div>

        {rink.locations?.address && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{rink.locations.address}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <StatusBadge status={status} />
          {rink.has_boards && (
            <span className="text-xs text-gray-400">Boards</span>
          )}
        </div>

        {liveStatus?.reason && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1.5">
            {liveStatus.reason}
          </p>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Sign in to save your favourite rinks."
      />
    </>
  );
}
