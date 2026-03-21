"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { AuthModal } from "@/components/ui/AuthModal";
import { Bell, LogOut, LayoutDashboard, CalendarDays } from "lucide-react";
import { APP_VERSION, VERSION_NOTES } from "@/lib/config/version";

// ── Today's sessions bell ─────────────────────────────────────────────────────
// Fetches drop-in alerts on mount and shows a popup of sessions happening today.

interface TodaySession {
  course_title: string;
  location_name: string;
  start_time: string;
  end_time: string;
}

function TodayAlertsBell() {
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dropin-alerts")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then(({ data }) => {
        if (!Array.isArray(data)) return;
        const todayStr = new Date().toISOString().slice(0, 10);
        const sessions: TodaySession[] = [];
        for (const alert of data) {
          for (const s of alert.sessions ?? []) {
            if (s.first_date === todayStr) {
              sessions.push({
                course_title:  alert.course_title,
                location_name: alert.location_name,
                start_time:    s.start_time,
                end_time:      s.end_time,
              });
            }
          }
        }
        setTodaySessions(sessions);
      })
      .catch(() => {});
  }, []);

  // Close popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Today's drop-in sessions"
        className="relative p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
      >
        <Bell size={18} />
        {todaySessions.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {todaySessions.length > 9 ? "9+" : todaySessions.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Today&apos;s Drop-in Sessions</p>
          </div>
          {todaySessions.length === 0 ? (
            <p className="px-4 py-4 text-xs text-gray-400">No drop-in sessions matching your alerts today.</p>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {todaySessions.map((s, i) => (
                <li key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                  <CalendarDays size={13} className="shrink-0 text-brand" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{s.course_title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{s.location_name}</p>
                    <p className="text-[11px] text-brand font-medium">{fmt(s.start_time)}–{fmt(s.end_time)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Extract "username" from email: "rohan.sartho@gmail.com" → "rohan.sartho"
function emailToUsername(email: string): string {
  return email.split("@")[0] ?? email;
}

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showVersion, setShowVersion] = useState(false);
  const versionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showVersion) return;
    function handleClickOutside(e: MouseEvent) {
      if (versionRef.current && !versionRef.current.contains(e.target as Node)) {
        setShowVersion(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showVersion]);

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-gray-200" style={{ backgroundColor: "#f5f2ec" }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="FindRec logo" width={36} height={36} />
            <span style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 700, fontSize: "18px", color: "#1a3a2a", letterSpacing: "-0.5px" }}>
              FindRec <span style={{ fontWeight: 300, fontStyle: "italic", fontSize: "19px" }}>Toronto</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {!loading && (
              <>
                {user ? (
                  <>
                    {/* Today's alerts bell — left of the user button */}
                    <TodayAlertsBell />

                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-lg hover:bg-gray-50 transition text-sm"
                      >
                        {/* Avatar bubble — matches sign-in button colour */}
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: "#1a3a2a" }}
                        >
                          {(user.email?.[0] ?? "?").toUpperCase()}
                        </span>
                        <span className="hidden sm:block text-gray-700 truncate max-w-[100px]">
                          {emailToUsername(user.email ?? "")}
                        </span>
                      </button>

                      {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-48 z-50">
                          <Link
                            href="/dashboard"
                            onClick={() => setShowMenu(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LayoutDashboard size={14} />
                            Dashboard
                          </Link>
                          <button
                            onClick={() => { signOut(); setShowMenu(false); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LogOut size={14} />
                            Sign out
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-sm font-medium px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark transition"
                  >
                    Sign in
                  </button>
                )}
              </>
            )}

            {/* Version badge */}
            <div className="relative" ref={versionRef}>
              <button
                onClick={() => setShowVersion(v => !v)}
                className="inline-flex items-center px-2 py-1 rounded-full border border-gray-200 text-gray-400 font-mono text-[11px] select-none hover:border-brand/40 hover:text-brand transition-colors"
              >
                v{APP_VERSION}
              </button>
              <div className={`absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 shadow-lg rounded-xl p-3 transition-opacity duration-150 z-50 ${showVersion ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
                <p className="text-xs font-semibold mb-2" style={{ color: "#1a3a2a", fontFamily: "var(--font-fraunces), serif" }}>
                  What&apos;s in each version
                </p>
                <ul className="space-y-1.5">
                  {Object.entries(VERSION_NOTES)
                    .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                    .map(([ver, note]) => (
                      <li key={ver} className="flex gap-2 items-start">
                        <span
                          className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded-md mt-0.5"
                          style={ver === APP_VERSION ? { background: "#1a3a2a", color: "#c8f0d4" } : { background: "#f3f4f6", color: "#6b7280" }}
                        >
                          v{ver}
                        </span>
                        <span className="text-gray-600 text-[11px] leading-relaxed">{note}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}
