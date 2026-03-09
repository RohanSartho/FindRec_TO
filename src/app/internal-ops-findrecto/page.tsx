import { KpiCard } from "@/components/admin/KpiCard";
import { AdminChart } from "@/components/admin/AdminChart";
import type { ChartRow } from "@/components/admin/AdminChart";

/* ── PostHog HogQL helpers ──────────────────────────────────────────────── */

const PH_HOST    = "https://us.posthog.com";
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID!;
const PH_KEY     = process.env.POSTHOG_PRIVATE_KEY!;

/** Run a HogQL query against the PostHog Query API (server-only). */
async function phQuery(query: string): Promise<unknown[][]> {
  try {
    const res = await fetch(`${PH_HOST}/api/projects/${PROJECT_ID}/query/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PH_KEY}`,
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      next: { revalidate: 300 }, // cache for 5 minutes
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results as unknown[][]) ?? [];
  } catch {
    return [];
  }
}

/** Pull a single numeric result from the first row/col, defaulting to 0. */
function scalar(rows: unknown[][]): number {
  return Number(rows?.[0]?.[0] ?? 0);
}

/** Convert {name, value} rows into ChartRow[]. */
function toChart(rows: unknown[][]): ChartRow[] {
  return rows.map((r) => ({ name: String(r[0] ?? ""), value: Number(r[1] ?? 0) }));
}

/* ── Data fetching ──────────────────────────────────────────────────────── */

async function fetchDashboardData() {
  const [
    totalPageviews, uniqueUsers, totalSearches, totalFavourites,
    pageviewsByDay,
    dropinSearches, dropinTopActivities, dropinEmpty,
    programSearches, programTopActivities,
    topVenues, venueCardClicks,
    nearMeClicks, viewToggles, mapMarkerClicks,
    authLogins, authSignups,
  ] = await Promise.all([
    phQuery(`SELECT count() FROM events WHERE event = '$pageview' AND timestamp > now() - interval 30 day`),
    phQuery(`SELECT count(DISTINCT person_id) FROM events WHERE event = '$pageview' AND timestamp > now() - interval 30 day`),
    phQuery(`SELECT count() FROM events WHERE event IN ('dropin_search','programs_search') AND timestamp > now() - interval 30 day`),
    phQuery(`SELECT count() FROM events WHERE event = 'favourite_add' AND timestamp > now() - interval 30 day`),

    phQuery(`
      SELECT toDate(timestamp) AS day, count() AS views
      FROM events WHERE event = '$pageview' AND timestamp > now() - interval 14 day
      GROUP BY day ORDER BY day ASC
    `),

    phQuery(`SELECT count() FROM events WHERE event = 'dropin_search' AND timestamp > now() - interval 30 day`),
    phQuery(`
      SELECT properties.activity_type, count() AS n FROM events
      WHERE event = 'dropin_search' AND timestamp > now() - interval 30 day
        AND properties.activity_type IS NOT NULL
      GROUP BY properties.activity_type ORDER BY n DESC LIMIT 8
    `),
    phQuery(`SELECT count() FROM events WHERE event = 'dropin_search_empty' AND timestamp > now() - interval 30 day`),

    phQuery(`SELECT count() FROM events WHERE event = 'programs_search' AND timestamp > now() - interval 30 day`),
    phQuery(`
      SELECT properties.activity_type, count() AS n FROM events
      WHERE event = 'programs_search' AND timestamp > now() - interval 30 day
        AND properties.activity_type IS NOT NULL
      GROUP BY properties.activity_type ORDER BY n DESC LIMIT 8
    `),

    phQuery(`
      SELECT properties.location_name, count() AS n FROM events
      WHERE event = 'venue_detail_view' AND timestamp > now() - interval 30 day
        AND properties.location_name IS NOT NULL
      GROUP BY properties.location_name ORDER BY n DESC LIMIT 10
    `),
    phQuery(`SELECT count() FROM events WHERE event = 'venue_card_click' AND timestamp > now() - interval 30 day`),

    phQuery(`SELECT count() FROM events WHERE event = 'map_near_me_click' AND timestamp > now() - interval 30 day`),
    phQuery(`
      SELECT properties.view_mode, count() AS n FROM events
      WHERE event IN ('venues_view_toggle','dropin_view_toggle') AND timestamp > now() - interval 30 day
        AND properties.view_mode IS NOT NULL
      GROUP BY properties.view_mode ORDER BY n DESC
    `),
    phQuery(`SELECT count() FROM events WHERE event = 'map_marker_click' AND timestamp > now() - interval 30 day`),

    phQuery(`SELECT count() FROM events WHERE event = 'auth_login' AND timestamp > now() - interval 30 day`),
    phQuery(`SELECT count() FROM events WHERE event = 'auth_signup' AND timestamp > now() - interval 30 day`),
  ]);

  return {
    kpis: {
      pageviews:  scalar(totalPageviews),
      users:      scalar(uniqueUsers),
      searches:   scalar(totalSearches),
      favourites: scalar(totalFavourites),
    },
    pageviewsByDay:    toChart(pageviewsByDay),
    dropin: {
      searches:      scalar(dropinSearches),
      topActivities: toChart(dropinTopActivities),
      emptyResults:  scalar(dropinEmpty),
    },
    programs: {
      searches:      scalar(programSearches),
      topActivities: toChart(programTopActivities),
    },
    venues: {
      topViewed:  toChart(topVenues),
      cardClicks: scalar(venueCardClicks),
    },
    features: {
      nearMeClicks:        scalar(nearMeClicks),
      viewToggleBreakdown: toChart(viewToggles),
      mapMarkerClicks:     scalar(mapMarkerClicks),
    },
    auth: {
      logins:  scalar(authLogins),
      signups: scalar(authSignups),
    },
  };
}

/* ── Layout helpers ─────────────────────────────────────────────────────── */

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      className="font-bold text-lg mb-4"
      style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
    >
      {title}
    </h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 shadow-sm rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default async function AdminDashboardPage() {
  const data = await fetchDashboardData();

  return (
    <div className="min-h-screen" style={{ background: "#f5f2ec" }}>
      {/* Top nav bar — matches site Navbar style */}
      <header className="flex items-center gap-3 px-8 py-4 border-b border-gray-200 bg-[#f5f2ec]">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "#1a3a2a" }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="8" r="3.5" stroke="#c8f0d4" strokeWidth="1.8" />
            <path d="M10 12.5C6.5 12.5 4 14.5 4 16.5" stroke="#c8f0d4" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M10 12.5C13.5 12.5 16 14.5 16 16.5" stroke="#c8f0d4" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <span
          className="font-bold text-sm"
          style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
        >
          FindRec Admin
        </span>
        <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 tracking-wider">
          INTERNAL
        </span>
        <span className="ml-auto text-xs text-gray-400">Last 30 days · refreshes every 5 min</span>
      </header>

      <main className="px-6 py-8 max-w-7xl mx-auto space-y-10">

        {/* ── 1. KPI Row ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Overview" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Pageviews"    value={data.kpis.pageviews.toLocaleString()}  />
            <KpiCard label="Unique Users" value={data.kpis.users.toLocaleString()}      />
            <KpiCard label="Searches"     value={data.kpis.searches.toLocaleString()}   />
            <KpiCard label="Favourites"   value={data.kpis.favourites.toLocaleString()} />
          </div>
        </section>

        {/* ── 2. Pageviews trend ─────────────────────────────────────── */}
        <section>
          <SectionHeader title="Pageviews — Last 14 Days" />
          <Card>
            <AdminChart data={data.pageviewsByDay} type="line" height={220} />
          </Card>
        </section>

        {/* ── 3. Drop-in analytics ───────────────────────────────────── */}
        <section>
          <SectionHeader title="Drop-in Search" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <KpiCard label="Searches (30d)"      value={data.dropin.searches.toLocaleString()} />
            <KpiCard label="Empty Results (30d)" value={data.dropin.emptyResults.toLocaleString()} />
            <KpiCard
              label="Empty Rate"
              value={data.dropin.searches > 0
                ? `${((data.dropin.emptyResults / data.dropin.searches) * 100).toFixed(1)}%`
                : "—"}
            />
          </div>
          <Card>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Top Activity Types</p>
            <AdminChart data={data.dropin.topActivities} type="bar" height={200} />
          </Card>
        </section>

        {/* ── 4. Programs analytics ──────────────────────────────────── */}
        <section>
          <SectionHeader title="Programs Search" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <KpiCard label="Program Searches (30d)" value={data.programs.searches.toLocaleString()} />
          </div>
          <Card>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Top Activity Types</p>
            <AdminChart data={data.programs.topActivities} type="bar" color="#40916c" height={200} />
          </Card>
        </section>

        {/* ── 5. Venue engagement ────────────────────────────────────── */}
        <section>
          <SectionHeader title="Venue Engagement" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <KpiCard label="Venue Card Clicks (30d)" value={data.venues.cardClicks.toLocaleString()} />
          </div>
          <Card>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Top Viewed Venues</p>
            <AdminChart data={data.venues.topViewed} type="bar" color="#52b788" height={240} />
          </Card>
        </section>

        {/* ── 6. Feature usage ───────────────────────────────────────── */}
        <section>
          <SectionHeader title="Feature Usage" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <KpiCard label="Near Me Clicks"    value={data.features.nearMeClicks.toLocaleString()} />
            <KpiCard label="Map Marker Clicks" value={data.features.mapMarkerClicks.toLocaleString()} />
          </div>
          <Card>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">View Mode Toggles</p>
            <AdminChart data={data.features.viewToggleBreakdown} type="bar" height={180} />
          </Card>
        </section>

        {/* ── 7. Auth funnel ─────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Auth Funnel" />
          <div className="grid grid-cols-2 gap-4">
            <KpiCard label="Logins (30d)"  value={data.auth.logins.toLocaleString()}  />
            <KpiCard label="Signups (30d)" value={data.auth.signups.toLocaleString()} />
          </div>
        </section>

      </main>
    </div>
  );
}
