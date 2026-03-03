import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Building2, TreePine, Users, Ruler, ExternalLink } from "lucide-react";
import { Timetable } from "@/components/rinks/Timetable";

interface PageProps {
  params: Promise<{ asset_id: string }>;
}

export default async function RinkDetailPage({ params }: PageProps) {
  const { asset_id } = await params;
  const supabase = await createClient();

  const { data: rink, error } = await supabase
    .from("rinks")
    .select(`
      *,
      locations (
        id, name, address, postal_code, ward,
        district, community_council, coordinates
      ),
      rink_live_status (
        status, reason, comments, posted_date, fetched_at
      )
    `)
    .eq("asset_id", parseInt(asset_id))
    .order("fetched_at", { referencedTable: "rink_live_status", ascending: false })
    .limit(1, { referencedTable: "rink_live_status" })
    .single();

  if (error || !rink) notFound();

  const liveStatus = (rink.rink_live_status as any[])?.[0];
  const loc = rink.locations as any;
  const displayName = rink.public_name || rink.asset_name;
  const torontoUrl = loc?.id
    ? `https://www.toronto.ca/explore-enjoy/parks-recreation/places-spaces/parks-and-recreation-facilities/location/?id=${loc.id}&title=${(loc.name || displayName).replace(/\s+/g, "-")}`
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        href="/activities"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft size={16} />
        Back to venues
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            {rink.rink_type === "indoor" ? (
              <Building2 size={16} className="text-brand" />
            ) : (
              <TreePine size={16} className="text-green-500" />
            )}
            <span className="text-sm text-gray-600 font-medium capitalize">
              {rink.rink_type} rink
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}>
            {displayName}
          </h1>
          {loc?.name && loc.name !== displayName && (
            <p className="text-gray-600 text-base mt-1">{loc.name}</p>
          )}
        </div>

        {/* Live status reason */}
        {liveStatus?.reason && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2 mb-4">
            <p className="text-sm text-yellow-800 font-medium">{liveStatus.reason}</p>
            {liveStatus.comments && (
              <p className="text-xs text-yellow-700 mt-0.5">{liveStatus.comments}</p>
            )}
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
          {loc?.address && (
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

          {rink.operated_by && (
            <div className="flex items-start gap-2 text-gray-700">
              <Users size={15} className="mt-0.5 shrink-0 text-gray-500" />
              <div>
                <p>{rink.operated_by}</p>
                <p className="text-sm text-gray-500">Operated by</p>
              </div>
            </div>
          )}

          {(rink.pad_length_ft || rink.ice_pad_size) && (
            <div className="flex items-start gap-2 text-gray-700">
              <Ruler size={15} className="mt-0.5 shrink-0 text-gray-500" />
              <div>
                {rink.pad_length_ft && rink.pad_width_ft ? (
                  <p>{rink.pad_length_ft} × {rink.pad_width_ft} ft</p>
                ) : null}
                {rink.ice_pad_size && rink.ice_pad_size !== "None" && (
                  <p className="text-sm text-gray-500">{rink.ice_pad_size}</p>
                )}
              </div>
            </div>
          )}

          {rink.has_boards !== null && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className={`text-sm px-2 py-0.5 rounded-full ${
                rink.has_boards
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-50 text-gray-600"
              }`}>
                {rink.has_boards ? "Has boards" : "No boards"}
              </span>
            </div>
          )}

          {loc?.district && (
            <div className="text-sm text-gray-600 col-span-full">
              {loc.district}
              {loc.ward ? ` · Ward ${loc.ward}` : ""}
            </div>
          )}
        </div>

        {/* Links */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
          {loc?.address && (
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
            href={`https://www.google.com/search?q=${encodeURIComponent(displayName + " Toronto Parks Recreation")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-brand hover:underline"
          >
            <ExternalLink size={13} />
            Search online
          </a>
          {torontoUrl && (
            <a
              href={torontoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-brand hover:underline"
            >
              <ExternalLink size={13} />
              toronto.ca official page
            </a>
          )}
        </div>
      </div>

      {/* Timetable */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}>Schedule</h2>
        <Timetable assetId={parseInt(asset_id)} rinkType={rink.rink_type} />
      </div>
    </div>
  );
}
