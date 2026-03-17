"use client";

import { useEffect, useState } from "react";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  label: string;
  description: string;
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-in-out focus:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-brand" : "bg-gray-200",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0",
          "transition-transform duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// ── FeatureTogglesPanel ───────────────────────────────────────────────────────
// Client component — fetches flags from the admin API on mount.
// Renders a toggle row per flag. Optimistic updates with rollback on error.

export function FeatureTogglesPanel() {
  const [flags, setFlags]   = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]     = useState<Record<string, boolean>>({});
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/feature-flags")
      .then((r) => r.json())
      .then(({ data }) => {
        setFlags(data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load feature flags.");
        setLoading(false);
      });
  }, []);

  async function toggle(flag: FeatureFlag) {
    const prev = flag.enabled;
    // Optimistic update
    setFlags((fs) => fs.map((f) => f.key === flag.key ? { ...f, enabled: !prev } : f));
    setBusy((b) => ({ ...b, [flag.key]: true }));

    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: flag.key, enabled: !prev }),
      });
      if (!res.ok) throw new Error("Server error");
    } catch {
      // Rollback on failure
      setFlags((fs) => fs.map((f) => f.key === flag.key ? { ...f, enabled: prev } : f));
      setError(`Failed to update "${flag.label}". Try again.`);
    } finally {
      setBusy((b) => ({ ...b, [flag.key]: false }));
    }
  }

  if (loading) {
    return <p className="text-xs text-gray-400 animate-pulse">Loading feature flags…</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}
      {flags.length === 0 && (
        <p className="text-xs text-gray-400">No feature flags defined yet.</p>
      )}
      {flags.map((flag) => (
        <div
          key={flag.key}
          className="flex items-start justify-between gap-4 bg-white border border-gray-100 rounded-xl px-5 py-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-gray-900">{flag.label}</p>
              <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{flag.key}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{flag.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <span className={`text-xs font-medium ${flag.enabled ? "text-brand" : "text-gray-400"}`}>
              {flag.enabled ? "On" : "Off"}
            </span>
            <Toggle
              checked={flag.enabled}
              onChange={() => toggle(flag)}
              disabled={busy[flag.key] ?? false}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
