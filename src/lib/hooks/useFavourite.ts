"use client";

import { useState } from "react";
import { useFavourites } from "@/lib/context/FavouritesContext";

export function useFavourite(locationId: number) {
  const { favouriteLocationIds, toggle: contextToggle } = useFavourites();
  const [loading, setLoading] = useState(false);

  const isFavourited = favouriteLocationIds.has(locationId);

  const toggle = async () => {
    setLoading(true);
    try {
      return await contextToggle(locationId);
    } finally {
      setLoading(false);
    }
  };

  return { isFavourited, toggle, loading };
}
