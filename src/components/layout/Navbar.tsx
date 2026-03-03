"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { AuthModal } from "@/components/ui/AuthModal";
import { User, LogOut, Heart } from "lucide-react";

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-gray-200" style={{ backgroundColor: "#f5f2ec" }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div style={{ width: "32px", height: "32px", background: "#1a3a2a", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="8" r="3.5" stroke="#c8f0d4" strokeWidth="1.8" />
                <path d="M10 12.5C6.5 12.5 4 14.5 4 16.5" stroke="#c8f0d4" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M10 12.5C13.5 12.5 16 14.5 16 16.5" stroke="#c8f0d4" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 700, fontSize: "17px", color: "#1a3a2a", letterSpacing: "-0.5px" }}>
              FindRec <span style={{ fontWeight: 300, fontStyle: "italic" }}>Toronto</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/skating"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              Explore
            </Link>

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
                          href="/favourites"
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Heart size={14} />
                          My Favourites
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
