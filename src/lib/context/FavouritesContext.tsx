"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

interface FavouritesContextValue {
  favouriteLocationIds: Set<number>;
  loading: boolean;
  toggle: (locationId: number) => Promise<{ requiresAuth: boolean }>;
  refresh: () => Promise<void>;
}

const FavouritesContext = createContext<FavouritesContextValue>({
  favouriteLocationIds: new Set(),
  loading: false,
  toggle: async () => ({ requiresAuth: true }),
  refresh: async () => {},
});

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favouriteLocationIds, setFavouriteLocationIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setFavouriteLocationIds(new Set()); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/favourites");
      const data = await res.json();
      const ids = new Set<number>((data?.data ?? []).map((f: any) => f.location_id as number));
      setFavouriteLocationIds(ids);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (locationId: number): Promise<{ requiresAuth: boolean }> => {
    if (!user) return { requiresAuth: true };

    const isFavourited = favouriteLocationIds.has(locationId);

    // Optimistic update
    setFavouriteLocationIds((prev) => {
      const next = new Set(prev);
      if (isFavourited) next.delete(locationId);
      else next.add(locationId);
      return next;
    });

    try {
      await fetch("/api/favourites", {
        method: isFavourited ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId }),
      });
    } catch {
      // Rollback optimistic update on error
      setFavouriteLocationIds((prev) => {
        const next = new Set(prev);
        if (isFavourited) next.add(locationId);
        else next.delete(locationId);
        return next;
      });
    }

    return { requiresAuth: false };
  };

  return (
    <FavouritesContext.Provider value={{ favouriteLocationIds, loading, toggle, refresh }}>
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites() {
  return useContext(FavouritesContext);
}
