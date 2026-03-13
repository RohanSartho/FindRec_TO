"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { AuthModal } from "@/components/ui/AuthModal";
import { User, LogOut, LayoutDashboard } from "lucide-react";
import { APP_VERSION, VERSION_NOTES } from "@/lib/config/version";

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700"
                    >
                      <User size={16} />
                      <span className="hidden sm:block truncate max-w-[120px]">
                        {user.email}
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
            <div className="group relative">
              <span className="inline-flex items-center px-2 py-1 rounded-full border border-gray-200 text-gray-400 font-mono text-[11px] cursor-default select-none hover:border-brand/40 hover:text-brand transition-colors">
                v{APP_VERSION}
              </span>
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 shadow-lg rounded-xl p-3 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
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
