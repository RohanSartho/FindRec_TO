import { APP_VERSION, VERSION_NOTES } from "@/lib/config/version";

/**
 * Minimal site footer — version badge with a tooltip listing what each
 * version introduced. Rendered below <main> in the root layout.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 py-6 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">

        {/* Left: brand + data credit */}
        <p>
          <span className="font-medium text-gray-500">FindRec TO</span>
          {" · "}
          Data:{" "}
          <a
            href="https://open.toronto.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand underline underline-offset-2 transition-colors"
          >
            City of Toronto Open Data
          </a>
        </p>

        {/* Right: version badge + tooltip */}
        <div className="group relative">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 font-mono text-[11px] cursor-default select-none hover:border-brand/40 hover:text-brand transition-colors"
          >
            v{APP_VERSION}
          </span>

          {/* Tooltip — appears above the badge on hover */}
          <div
            className="
              absolute bottom-full right-0 mb-2 w-64
              bg-white border border-gray-100 shadow-lg rounded-xl p-3
              opacity-0 pointer-events-none group-hover:opacity-100
              transition-opacity duration-150 z-50
            "
          >
            <p
              className="text-xs font-semibold mb-2"
              style={{ color: "#1a3a2a", fontFamily: "var(--font-fraunces), serif" }}
            >
              What&apos;s in each version
            </p>
            <ul className="space-y-1.5">
              {Object.entries(VERSION_NOTES)
                .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                .map(([ver, note]) => (
                  <li key={ver} className="flex gap-2 items-start">
                    <span
                      className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded-md mt-0.5"
                      style={
                        ver === APP_VERSION
                          ? { background: "#1a3a2a", color: "#c8f0d4" }
                          : { background: "#f3f4f6", color: "#6b7280" }
                      }
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
    </footer>
  );
}
