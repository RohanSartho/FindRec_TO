"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, CalendarDays, BookOpen } from "lucide-react";
import { VenuesSection } from "@/components/venues/VenuesSection";
import { DropInsSection } from "@/components/dropin/DropInsSection";
import { ProgramsSection } from "@/components/programs/ProgramsSection";
import clsx from "clsx";

type PageMode = "venues" | "dropins" | "programs";

const TABS = [
  { id: "venues"   as const, label: "Community Centres",   icon: Building2   },
  { id: "dropins"  as const, label: "Drop-in Activities",  icon: CalendarDays },
  { id: "programs" as const, label: "Registered Programs", icon: BookOpen    },
];

function ActivitiesPageInner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<PageMode>(() => {
    const tab = searchParams.get("tab");
    return tab === "dropins" ? "dropins" : tab === "programs" ? "programs" : "venues";
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-4"
          style={{ fontFamily: "var(--font-fraunces), serif", color: "#1a3a2a" }}
        >
          Find Community Centres &amp; Activities in Toronto
        </h1>
        <div className="flex flex-wrap gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition",
                mode === id
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand"
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sections stay mounted (hidden when inactive) so filter state is preserved across tab switches */}
      <div className={mode !== "venues"   ? "hidden" : ""}><VenuesSection /></div>
      <div className={mode !== "dropins"  ? "hidden" : ""}><DropInsSection /></div>
      <div className={mode !== "programs" ? "hidden" : ""}><ProgramsSection /></div>
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <React.Suspense fallback={null}>
      <ActivitiesPageInner />
    </React.Suspense>
  );
}
