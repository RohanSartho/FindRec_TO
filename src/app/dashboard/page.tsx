"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { AuthModal } from "@/components/ui/AuthModal";
import { VenueCard, Venue } from "@/components/venues/VenueCard";
import {
  Loader2, LayoutDashboard, Heart, LogOut,
  Bell, Bookmark, X, ExternalLink, CalendarDays,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

// ── Type definitions ──────────────────────────────────────────────────────────

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
    rinks: { asset_id: number; rink_type: string }[];
  } | null;
}

interface DropinSession {
  first_date: string;
  start_time: string;
  end_time: string;
}

interface DropinAlert {
  id: number;
  location_id: number;
  course_title: string;
  created_at: string;
  location_name: string;
  sessions: DropinSession[];
}

interface WatchlistEntry {
  id: number;
  course_id: number;
  location_id: number;
  created_at: string;
  course_title: string | null;
  activity_title: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  activity_url: string | null;
  location_name: string;
}

// ── Helper: map favourites API row → VenueCard shape ─────────────────────────

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
    activity_types: [],
    rink: firstRink
      ? { asset_id: firstRink.asset_id, rink_type: firstRink.rink_type as "indoor" | "outdoor" }
      : null,
  };
}

// ── Helper: format a drop-in session pill ────────────────────────────────────

function formatSessionPill(session: DropinSession): string {
  const dateObj = new Date(session.first_date + "T00:00:00");
  const dateStr = dateObj.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
  // Format time: "14:30:00" → "2:30 PM"
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  return `${dateStr} · ${fmt(session.start_time)}–${fmt(session.end_time)}`;
}

// ── Helper: program status badge ─────────────────────────────────────────────

function parseStatus(status: string | null, endDate: string | null) {
  // If end_date has passed, override to "Ended" regardless of DB status
  if (endDate) {
    const end = new Date(endDate + "T23:59:59");
    if (end < new Date()) return "ended" as const;
  }
  if (!status) return "unknown" as const;
  const lower = status.toLowerCase();
  if (lower.includes("cancel")) return "cancelled" as const;
  if (lower.includes("wait"))   return "waitlist"  as const;
  if (lower.includes("full"))   return "full"      as const;
  if (lower.includes("open") || lower.includes("avail")) return "open" as const;
  return "unknown" as const;
}

const STATUS_CONFIG = {
  open:      { bg: "bg-green-50",  text: "text-green-800",  dot: "bg-green-500",  label: "Open"      },
  waitlist:  { bg: "bg-yellow-50", text: "text-yellow-800", dot: "bg-yellow-400", label: "Waitlist"  },
  full:      { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500",    label: "Full"      },
  cancelled: { bg: "bg-gray-100",  text: "text-gray-500",   dot: "bg-gray-400",   label: "Cancelled" },
  ended:     { bg: "bg-gray-100",  text: "text-gray-500",   dot: "bg-gray-300",   label: "Ended"     },
  unknown:   { bg: "bg-gray-50",   text: "text-gray-500",   dot: "bg-gray-300",   label: "—"         },
} as const;

function WatchlistStatusBadge({ status, endDate }: { status: string | null; endDate: string | null }) {
  const key = parseStatus(status, endDate);
  const cfg = STATUS_CONFIG[key];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap", cfg.bg, cfg.text)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function formatShortDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

// ── Empty state shared component ─────────────────────────────────────────────

function EmptyState({ icon: Icon, message, cta }: {
  icon: React.ElementType;
  message: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 text-gray-400">
      <Icon size={32} className="mx-auto mb-3 text-gray-200" />
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {cta}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();

  const [venues, setVenues]       = useState<Venue[]>([]);
  const [alerts, setAlerts]       = useState<DropinAlert[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    // Fetch all three sections in parallel
    Promise.all([
      fetch("/api/favourites").then((r) => r.json()),
      fetch("/api/dropin-alerts").then((r) => r.json()),
      fetch("/api/program-watchlist").then((r) => r.json()),
    ]).then(([favJson, alertsJson, watchlistJson]) => {
      const rows: FavouriteRow[] = favJson?.data ?? [];
      setVenues(rows.map(toVenue).filter(Boolean) as Venue[]);
      setAlerts(alertsJson?.data ?? []);
      setWatchlist(watchlistJson?.data ?? []);
      setLoading(false);
    });
  }, [user, authLoading]);

  // ── Remove handlers ──────────────────────────────────────────────────────

  async function removeAlert(id: number) {
    await fetch("/api/dropin-alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function removeWatchlistEntry(id: number) {
    await fetch("/api/program-watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-brand" />
      </div>
    );
  }

  // ── Not signed in ────────────────────────────────────────────────────────
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

  // ── Signed in ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
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

      {/* ── Saved Venues ──────────────────────────────────────────────────── */}
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
          <EmptyState
            icon={Heart}
            message="No saved venues yet. Browse activities and tap ♥ on any venue to save it here."
            cta={
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link
                  href="/activities"
                  className="flex items-center gap-2.5 bg-brand text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-brand-dark transition-all hover:-translate-y-0.5"
                  style={{ boxShadow: "0 4px 20px rgba(26,58,42,0.25)" }}
                >
                  Search Activities
                </Link>
                <Link
                  href="/activities?view=map"
                  className="flex items-center gap-2.5 bg-transparent text-brand px-7 py-4 rounded-full text-base font-semibold border-2 border-brand hover:bg-brand hover:text-white transition-all"
                >
                  View Map
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </section>

      {/* ── Drop-in Alerts ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-brand" />
          <h2 className="text-lg font-semibold text-gray-900">
            Drop-in Alerts
            {alerts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>
        </div>

        {alerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            message="No drop-in alerts yet. Add one from the drop-in search."
            cta={
              <Link
                href="/activities"
                className="inline-flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-brand-dark transition"
              >
                Search Drop-ins
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-3"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">{alert.course_title}</span>
                    <span className="text-xs text-gray-400">at</span>
                    <Link
                      href={`/venues/${alert.location_id}`}
                      className="text-xs text-brand hover:underline font-medium"
                    >
                      {alert.location_name}
                    </Link>
                  </div>

                  {/* Session pills */}
                  {alert.sessions.length === 0 ? (
                    <p className="text-xs text-gray-400 mt-1.5">No sessions in the next 7 days</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {alert.sessions.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand/8 text-brand border border-brand/20"
                        >
                          <CalendarDays size={10} className="shrink-0" />
                          {formatSessionPill(s)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="self-start shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
                  aria-label="Remove alert"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Program Watchlist ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bookmark size={16} className="text-brand" />
          <h2 className="text-lg font-semibold text-gray-900">
            Program Watchlist
            {watchlist.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {watchlist.length} program{watchlist.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>
        </div>

        {watchlist.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            message="No programs tracked yet. Add one from the programs search."
            cta={
              <Link
                href="/activities"
                className="inline-flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-brand-dark transition"
              >
                Search Programs
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {watchlist.map((entry) => {
              const title   = entry.activity_title ?? entry.course_title ?? "Unknown Program";
              const isEnded = parseStatus(entry.status, entry.end_date) === "ended";

              return (
                <div
                  key={entry.id}
                  className={clsx(
                    "bg-white border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3",
                    isEnded ? "border-gray-100 opacity-60" : "border-gray-200"
                  )}
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {/* Program name — links to toronto.ca if available */}
                      {entry.activity_url ? (
                        <a
                          href={entry.activity_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-sm text-gray-900 hover:text-brand transition inline-flex items-center gap-1"
                        >
                          {title}
                          <ExternalLink size={10} className="text-gray-400 shrink-0" />
                        </a>
                      ) : (
                        <span className="font-semibold text-sm text-gray-900">{title}</span>
                      )}
                      <span className="text-xs text-gray-400">at</span>
                      <Link
                        href={`/venues/${entry.location_id}`}
                        className="text-xs text-brand hover:underline font-medium"
                      >
                        {entry.location_name}
                      </Link>
                    </div>

                    {/* Dates + status */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <WatchlistStatusBadge status={entry.status} endDate={entry.end_date} />
                      {(entry.start_date || entry.end_date) && (
                        <span className="text-xs text-gray-400">
                          {formatShortDate(entry.start_date)} – {formatShortDate(entry.end_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeWatchlistEntry(entry.id)}
                    className="self-start shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
                    aria-label="Remove from watchlist"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
