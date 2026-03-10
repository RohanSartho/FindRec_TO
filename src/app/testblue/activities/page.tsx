"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, CalendarDays, BookOpen } from "lucide-react";
import { VenuesSection } from "@/components/venues/VenuesSection";
import { DropInsSection } from "@/components/dropin/DropInsSection";
import { ProgramsSection } from "@/components/programs/ProgramsSection";

// Blue theme constant
const BLUE = "#096294";

type PageMode = "venues" | "dropins" | "programs";

const TABS = [
  { id: "venues"   as const, label: "Community Centres",   icon: Building2   },
  { id: "dropins"  as const, label: "Drop-in Activities",  icon: CalendarDays },
  { id: "programs" as const, label: "Registered Programs", icon: BookOpen    },
];

function TestBlueActivitiesInner() {
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
          style={{ fontFamily: "var(--font-fraunces), serif", color: BLUE }}
        >
          Find Community Centres &amp; Activities in Toronto
        </h1>
        <div className="flex flex-wrap gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition"
              style={
                mode === id
                  ? { background: BLUE, color: "#fff", borderColor: BLUE, boxShadow: "0 1px 4px rgba(9,98,148,0.2)" }
                  : { background: "#fff", color: "#4b5563", borderColor: "#e5e7eb" }
              }
              onMouseEnter={(e) => {
                if (mode !== id) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE;
                  (e.currentTarget as HTMLButtonElement).style.color = BLUE;
                }
              }}
              onMouseLeave={(e) => {
                if (mode !== id) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
                  (e.currentTarget as HTMLButtonElement).style.color = "#4b5563";
                }
              }}
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

export default function TestBlueActivitiesPage() {
  return (
    <React.Suspense fallback={null}>
      <TestBlueActivitiesInner />
    </React.Suspense>
  );
}
