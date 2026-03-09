import { useState } from "react";

/**
 * Encapsulates browser geolocation with loading state + error alerts.
 * Call `request(onSuccess)` — the callback receives (lat, lng) on success.
 */
export function useNearMe() {
  const [loading, setLoading] = useState(false);

  const request = (onSuccess: (lat: number, lng: number) => void) => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSuccess(pos.coords.latitude, pos.coords.longitude);
        setLoading(false);
      },
      (err) => {
        alert(
          err.code === 1
            ? "Location access denied. Allow location in your browser settings and try again."
            : err.code === 3
            ? "Location request timed out. Try again."
            : "Unable to get your location."
        );
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  return { loading, request };
}
