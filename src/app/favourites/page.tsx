"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { RinkCard } from "@/components/rinks/RinkCard";
import { AuthModal } from "@/components/ui/AuthModal";
import { Loader2, Heart } from "lucide-react";
import Link from "next/link";

export default function FavouritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [favourites, setFavourites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    fetch("/api/favourites")
      .then((r) => r.json())
      .then((data) => {
        setFavourites(data?.data ?? []);
        setLoading(false);
      });
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-brand" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <Heart size={40} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}>Your Favourites</h1>
          <p className="text-gray-500 mb-6">Sign in to save and view your favourite rinks.</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-dark transition"
          >
            Sign in
          </button>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  // Flatten rinks from favourites response
  const rinks = favourites.flatMap((fav: any) =>
    (fav.locations?.rinks ?? []).map((rink: any) => ({
      ...rink,
      locations: {
        name: fav.locations?.name,
        address: fav.locations?.address,
        district: fav.locations?.district,
      },
    }))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}>My Favourites</h1>
        <p className="text-gray-500">
          {rinks.length > 0
            ? `${rinks.length} saved rink${rinks.length !== 1 ? "s" : ""}`
            : "No favourites yet"}
        </p>
      </div>

      {rinks.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <Heart size={40} className="mx-auto mb-4 text-gray-200" />
          <p className="text-lg font-medium mb-1">No favourites yet</p>
          <p className="text-sm mb-6">
            Browse rinks and tap the heart to save them here.
          </p>
          <Link
            href="/skating"
            className="text-brand text-sm hover:underline"
          >
            Browse skating rinks →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rinks.map((rink: any) => (
            <RinkCard key={rink.asset_id} rink={rink} />
          ))}
        </div>
      )}
    </div>
  );
}
