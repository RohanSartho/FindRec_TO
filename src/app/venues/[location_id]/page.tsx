import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, ExternalLink, House, TreePine } from "lucide-react";
import { Timetable } from "@/components/rinks/Timetable";
import { VenueFavouriteButton } from "@/components/venues/VenueFavouriteButton";
import { AnalyticsPageEvent } from "@/components/analytics/AnalyticsPageEvent";

type SportFilter = "skating" | "aquatics" | "fitness" | "arts" | "sports" | "all";
const VALID_SPORT_FILTERS: SportFilter[] = ["skating", "aquatics", "fitness", "arts", "sports", "all"];

interface PageProps {
  params: Promise<{ location_id: string }>;
  searchParams: Promise<{ activity?: string; sub?: string; returnTo?: string }>;
}

export default async function VenueDetailPage({ params, searchParams }: PageProps) {
  const { location_id } = await params;
  const { activity, sub, returnTo } = await searchParams;

  // Map the incoming ?activity= query param to a valid SportFilter
  const defaultSportFilter: SportFilter =
    activity && VALID_SPORT_FILTERS.includes(activity as SportFilter)
      ? (activity as SportFilter)
      : "all";
  const supabase = await createClient();

  const { data: loc, error } = await supabase
    .from("locations")
    .select("id, name, address, postal_code, district, ward, community_council, venue_type")
    .eq("id", parseInt(location_id))
    .single();

  if (error || !loc) notFound();

  const torontoUrl = `https://www.toronto.ca/explore-enjoy/parks-recreation/places-spaces/parks-and-recreation-facilities/location/?id=${loc.id}&title=${(loc.name || "").replace(/\s+/g, "-")}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <AnalyticsPageEvent event="venue_detail_view" properties={{ location_id: loc.id, location_name: loc.name }} />

      {/* Back button */}
      <Link
        href={returnTo ?? "/activities"}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft size={16} />
        {returnTo ? "Back to results" : "Back to venues"}
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        {/* Badge row + Save button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            {loc.venue_type && (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                loc.venue_type === "indoor"
                  ? "bg-red-50 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}>
                {loc.venue_type === "indoor"
                  ? <House size={13} className="shrink-0" />
                  : <TreePine size={13} className="shrink-0" />
                }
                {loc.venue_type === "indoor" ? "Indoor" : "Outdoor"}
              </div>
            )}
          </div>
          <VenueFavouriteButton locationId={loc.id} />
        </div>
        <h1
          className="text-2xl font-bold leading-tight mb-4"
          style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
        >
          {loc.name}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
          {loc.address && (
            <div className="flex items-start gap-2 text-gray-700">
              <MapPin size={15} className="mt-0.5 shrink-0 text-gray-500" />
              <div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(loc.address + ", Toronto, ON")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand hover:underline transition"
                >
                  {loc.address}
                </a>
                {loc.postal_code && (
                  <p className="text-gray-500 text-sm">{loc.postal_code}</p>
                )}
              </div>
            </div>
          )}

          {loc.district && (
            <div className="text-sm text-gray-600">
              {loc.district}
              {loc.ward ? ` · Ward ${loc.ward}` : ""}
            </div>
          )}
        </div>

        {/* Links */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
          {loc.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(loc.address + ", Toronto, ON")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-brand hover:underline"
            >
              <MapPin size={13} />
              Get Directions
            </a>
          )}
          <a
            href={torontoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-brand hover:underline"
          >
            <ExternalLink size={13} />
            facility Toronto.ca official page
          </a>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2
          className="text-lg font-bold mb-4"
          style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
        >
          Schedule
        </h2>
        <Timetable
          locationId={parseInt(location_id)}
          defaultSportFilter={defaultSportFilter}
          defaultSubFilter={sub ?? ""}
          defaultShowPrograms={true}
        />
      </div>
    </div>
  );
}
