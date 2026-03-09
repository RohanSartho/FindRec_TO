"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { AuthModal } from "@/components/ui/AuthModal";
import { VenueCard, Venue } from "@/components/venues/VenueCard";
import { Loader2, LayoutDashboard, Heart, LogOut } from "lucide-react";
import Link from "next/link";

// Shape returned by /api/favourites GET (after Step 2 expansion)
interface FavouriteRow {
  id: number;
  location_id: number;
  locations: {
    name: string;
    address: string | null;
    district: string | null;
    venue_type: string | null;
    lat: number | null;
    lng: number | null;
    rinks: {
      asset_id: number;
      rink_type: string;
    }[];
  } | null;
}

/** Map a favourites API row → VenueCard's Venue shape. */
function toVenue(row: FavouriteRow): Venue | null {
  const loc = row.locations;
  if (!loc) return null;
  const firstRink = loc.rinks?.[0] ?? null;
  return {
    id:             row.location_id,
    name:           loc.name,
    address:        loc.address,
    district:       loc.district,
    venue_type:     loc.venue_type as Venue["venue_type"],
    lat:            loc.lat,
    lng:            loc.lng,
    // activity_types not stored on locations — chips won't render, card still valid
    activity_types: [],
    rink: firstRink
      ? { asset_id: firstRink.asset_id, rink_type: firstRink.rink_type as "indoor" | "outdoor" }
      : null,
  };
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [venues, setVenues]         = useState<Venue[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    fetch("/api/favourites")
      .then((r) => r.json())
      .then((json) => {
        const rows: FavouriteRow[] = json?.data ?? [];
        setVenues(rows.map(toVenue).filter(Boolean) as Venue[]);
        setLoading(false);
      });
  }, [user, authLoading]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-brand" />
      </div>
    );
  }

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <LayoutDashboard size={40} className="mx-auto text-gray-300 mb-4" />
          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
          >
            My Dashboard
          </h1>
          <p className="text-gray-500 mb-6">Sign in to save and view your favourite venues.</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-dark transition"
          >
            Sign in
          </button>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  // ── Signed in ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1
            className="text-3xl font-bold mb-1"
            style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
          >
            My Dashboard
          </h1>
          <p className="text-sm text-gray-500">Signed in as {user.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-brand hover:text-brand transition"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      {/* Saved Venues */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Heart size={16} className="text-brand" />
          <h2 className="text-lg font-semibold text-gray-900">
            Saved Venues
            {venues.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {venues.length} venue{venues.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>
        </div>

        {venues.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <Heart size={40} className="mx-auto mb-4 text-gray-200" />
            <p className="text-lg font-medium mb-1">No saved venues yet</p>
            <p className="text-sm mb-6">
              Browse activities and tap ♥ on any venue to save it here.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/activities"
                className="flex items-center gap-2.5 bg-brand text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-brand-dark transition-all hover:-translate-y-0.5"
                style={{ boxShadow: "0 4px 20px rgba(26,58,42,0.25)" }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="2" />
                  <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Search Activities
              </Link>
              <Link
                href="/activities?view=map"
                className="flex items-center gap-2.5 bg-transparent text-brand px-7 py-4 rounded-full text-base font-semibold border-2 border-brand hover:bg-brand hover:text-white transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2C6.24 2 4 4.24 4 7c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
                  <circle cx="9" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                View Map
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
