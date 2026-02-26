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
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-gray-900 text-lg tracking-tight">
            RecTO
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/skating"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              Skating
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
                    className="text-sm font-medium px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
