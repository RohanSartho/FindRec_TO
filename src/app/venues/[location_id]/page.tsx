import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, ExternalLink } from "lucide-react";
import { Timetable } from "@/components/rinks/Timetable";

interface PageProps {
  params: Promise<{ location_id: string }>;
}

export default async function VenueDetailPage({ params }: PageProps) {
  const { location_id } = await params;
  const supabase = await createClient();

  const { data: loc, error } = await supabase
    .from("locations")
    .select("id, name, address, postal_code, district, ward, community_council")
    .eq("id", parseInt(location_id))
    .single();

  if (error || !loc) notFound();

  const torontoUrl = `https://www.toronto.ca/explore-enjoy/parks-recreation/places-spaces/parks-and-recreation-facilities/location/?id=${loc.id}&title=${(loc.name || "").replace(/\s+/g, "-")}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        href="/skating"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft size={16} />
        Back to venues
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
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
            toronto.ca official page
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
        <Timetable locationId={parseInt(location_id)} defaultSportFilter="all" />
      </div>
    </div>
  );
}
