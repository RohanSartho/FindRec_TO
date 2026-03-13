/** Single source of truth for the app version displayed in the footer. */
export const APP_VERSION = "2.3";

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
};
