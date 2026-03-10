/**
 * Blue-theme layout for /testblue test pages.
 *
 * Overrides --color-brand globally on this page so every Tailwind utility
 * class that uses var(--color-brand) (bg-brand, text-brand, border-brand,
 * hover:border-brand, focus:ring-brand …) automatically becomes blue.
 *
 * Also patches the handful of hardcoded #1a3a2a hex values that bypass the
 * CSS variable (Navbar brand text, arbitrary Tailwind border classes, and
 * animation keyframes in globals.css).
 *
 * Nothing in the original product is modified.
 */
export default function TestBlueLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── Theme override: swap brand green → #096294 blue ───────────────── */}
      <style>{`
        /* 1. Override the Tailwind CSS custom property so every bg-brand /
              text-brand / border-brand utility picks up the blue value. */
        :root {
          --color-brand:      #096294 !important;
          --color-brand-dark: #074e76 !important;
        }

        /* 2. Navbar brand name — hardcoded inline color: #1a3a2a */
        nav a > span { color: #096294 !important; }

        /* 3. Tailwind arbitrary-colour border classes — border-[#1a3a2a] */
        .border-\\[#1a3a2a\\] { border-color: #096294 !important; }

        /* 4. Re-declare animation keyframes so pulsing borders / text
              also use the blue palette instead of the green one. */
        @keyframes filterPulse {
          0%, 100% { border-color: #096294; }
          50%       { border-color: rgba(9, 98, 148, 0.25); }
        }
        @keyframes activityBorderPulse {
          0%, 100% { border-color: rgba(9, 98, 148, 0.3); }
          50%       { border-color: #096294; }
        }
        @keyframes activityTextBlink {
          0%, 100% { color: #9ca3af; }
          50%       { color: #096294; }
        }
      `}</style>

      {children}
    </>
  );
}
