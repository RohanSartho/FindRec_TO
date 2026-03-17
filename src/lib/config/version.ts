/** Single source of truth for the app version displayed in the footer. */
export const APP_VERSION = "2.6";

/**
 * Human-readable summary of what each major version added.
 * V1 = skating-only era; V2 = all-activities platform.
 */
export const VERSION_NOTES: Record<string, string> = {
  "1.0": "Skating rinks, ice timetables & live rink status",
  "2.0": "All activities — venues browser, community centres & Mapbox maps",
  "2.1": "Drop-in search, registered programs & analytics dashboard",
  "2.2": "User feedback widget — report bugs & suggest features direct to Linear",
  "2.3": "Smart search — filters auto-refresh results after your first search",
  "2.4": "Drop-in Alerts + Program Watchlist — track sessions and registrations from your dashboard",
  "2.5": "Browser push notifications — get notified on days you have drop-in sessions",
  "2.6": "Admin feature toggles — enable or disable features like push notifications without code changes",
};
