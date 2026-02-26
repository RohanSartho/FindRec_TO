import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Building2, TreePine, Users, Ruler } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
        name, address, postal_code, ward,
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
  const status = (liveStatus?.status ?? "unknown") as "open" | "closed" | "service_alert" | "unknown";
  const loc = rink.locations as any;
  const displayName = rink.public_name || rink.asset_name;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        href="/skating"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft size={16} />
        Back to rinks
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {rink.rink_type === "indoor" ? (
                <Building2 size={16} className="text-blue-500" />
              ) : (
                <TreePine size={16} className="text-green-500" />
              )}
              <span className="text-sm text-gray-500 capitalize">
                {rink.rink_type} rink
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {displayName}
            </h1>
            {loc?.name && loc.name !== displayName && (
              <p className="text-gray-500 text-sm mt-1">{loc.name}</p>
            )}
          </div>
          <StatusBadge status={status} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {loc?.address && (
            <div className="flex items-start gap-2 text-gray-600">
              <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
              <div>
                <p>{loc.address}</p>
                {loc.postal_code && (
                  <p className="text-gray-400 text-xs">{loc.postal_code}</p>
                )}
              </div>
            </div>
          )}

          {rink.operated_by && (
            <div className="flex items-start gap-2 text-gray-600">
              <Users size={14} className="mt-0.5 shrink-0 text-gray-400" />
              <div>
                <p>{rink.operated_by}</p>
                <p className="text-xs text-gray-400">Operated by</p>
              </div>
            </div>
          )}

          {(rink.pad_length_ft || rink.ice_pad_size) && (
            <div className="flex items-start gap-2 text-gray-600">
              <Ruler size={14} className="mt-0.5 shrink-0 text-gray-400" />
              <div>
                {rink.pad_length_ft && rink.pad_width_ft ? (
                  <p>{rink.pad_length_ft} × {rink.pad_width_ft} ft</p>
                ) : null}
                {rink.ice_pad_size && rink.ice_pad_size !== "None" && (
                  <p className="text-xs text-gray-400">{rink.ice_pad_size}</p>
                )}
              </div>
            </div>
          )}

          {rink.has_boards !== null && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                rink.has_boards
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-50 text-gray-500"
              }`}>
                {rink.has_boards ? "Has boards" : "No boards"}
              </span>
            </div>
          )}

          {loc?.district && (
            <div className="text-xs text-gray-400 col-span-full">
              {loc.district}
              {loc.ward ? ` · Ward ${loc.ward}` : ""}
            </div>
          )}
        </div>

        {/* Fee note */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            For fee information and program registration visit{" "}
            <a
              href="https://www.toronto.ca/explore-enjoy/parks-recreation/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              toronto.ca/parks-recreation
            </a>
          </p>
        </div>
      </div>

      {/* Timetable */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Schedule</h2>
        <Timetable assetId={parseInt(asset_id)} />
      </div>
    </div>
  );
}
