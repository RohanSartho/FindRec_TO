"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useFavourite } from "@/lib/hooks/useFavourite";
import { AuthModal } from "@/components/ui/AuthModal";
import clsx from "clsx";

export function VenueFavouriteButton({ locationId }: { locationId: number }) {
  const { isFavourited, toggle, loading } = useFavourite(locationId);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleClick = async () => {
    const result = await toggle();
    if (result?.requiresAuth) setShowAuthModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={clsx(
          "flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition",
          isFavourited
            ? "border-red-300 bg-red-50 text-red-500 hover:bg-red-100"
            : "border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:text-red-400"
        )}
        aria-label={isFavourited ? "Remove from saved" : "Save venue"}
      >
        <Heart
          size={15}
          className={clsx("transition", isFavourited ? "fill-red-500 text-red-500" : "")}
        />
        {isFavourited ? "Saved" : "Save"}
      </button>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Sign in to save your favourite venues."
      />
    </>
  );
}
