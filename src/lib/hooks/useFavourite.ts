"use client";

import { useState } from "react";
import { useFavourites } from "@/lib/context/FavouritesContext";
import posthog from "posthog-js";

export function useFavourite(locationId: number, locationName?: string) {
  const { favouriteLocationIds, toggle: contextToggle } = useFavourites();
  const [loading, setLoading] = useState(false);

  const isFavourited = favouriteLocationIds.has(locationId);

  const toggle = async () => {
    setLoading(true);
    try {
      const result = await contextToggle(locationId);
      if (!result?.requiresAuth) {
        posthog.capture(isFavourited ? "favourite_remove" : "favourite_add", {
          location_id:   locationId,
          location_name: locationName ?? null,
        });
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  return { isFavourited, toggle, loading };
}
