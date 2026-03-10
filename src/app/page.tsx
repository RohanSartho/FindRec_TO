"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const activities = ["Skating", "Swimming", "Fitness", "Aquatics", "Drop-ins", "Classes"];

export default function HomePage() {
  const [activityIndex, setActivityIndex] = useState(0);
  const [fading, setFading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(false);
      setTimeout(() => {
        setActivityIndex((i) => (i + 1) % activities.length);
        setFading(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      {/* Decorative blobs */}
      <div style={{ position: "absolute", top: "-120px", right: "-100px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, #c8f0d4 0%, transparent 70%)", opacity: 0.7, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-60px", left: "-80px", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, #ffd6a5 0%, transparent 70%)", opacity: 0.6, pointerEvents: "none" }} />

      <div className="max-w-6xl mx-auto px-6 sm:px-12 pt-16 pb-20 relative z-10">

        {/* Live tag */}
        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold shadow-sm" style={{ color: "#2d6a4f" }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#52b788", animation: "heroPulse 2s infinite" }} />
          Toronto's Free Recreation Finder
        </div>

        {/* Headline */}
        <h1
          className="text-brand leading-none mb-4"
          style={{
            fontFamily: "var(--font-fraunces), serif",
            fontSize: "clamp(52px, 7vw, 88px)",
            fontWeight: 700,
            letterSpacing: "-2px",
            maxWidth: "820px",
          }}
        >
          Find your next<br />
          <span
            style={{
              fontStyle: "italic",
              fontWeight: 300,
              color: "#2d6a4f",
              fontFamily: "var(--font-fraunces), serif",
            }}
          >
            <span
              style={{
                display: "inline-block",
                opacity: fading ? 1 : 0,
                transform: fading ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                minWidth: "320px",
              }}
            >
              {activities[activityIndex]}
            </span>
          </span>{" "}
          session.
        </h1>

        {/* Subheadline */}
        <p className="text-lg leading-relaxed max-w-lg mb-12" style={{ color: "#556b6e" }}>
          Every community centre, rink, pool, and gym across Toronto: drop-in schedules,
          real-time availability, and map-based search. Filter by date, time, or distance.
          Recreation made simple.
        </p>

        {/* CTA row */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href="/activities"
            className="flex items-center gap-2.5 bg-brand text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-brand-dark transition-all hover:-translate-y-0.5"
            style={{ boxShadow: "0 4px 20px rgba(26,58,42,0.25)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="2" />
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Search Activities
          </Link>
          <Link
            href="/activities?view=map"
            className="flex items-center gap-2.5 bg-transparent text-brand px-7 py-4 rounded-full text-base font-semibold border-2 border-brand hover:bg-brand hover:text-white transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2C6.24 2 4 4.24 4 7c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
              <circle cx="9" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            View Map
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex gap-3 mt-12 flex-wrap">
          {[
            { icon: "📅", label: "Filter by Date & Time" },
            { icon: "📍", label: "Distance Search" },
            { icon: "🗺️", label: "Interactive Map" },
            { icon: "⚡", label: "Live Schedules" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 text-xs font-medium text-gray-700 shadow-sm"
            >
              <span>{icon}</span>
              {label}
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div className="mt-14 flex items-center gap-5 flex-wrap">
          <div className="flex">
            {(["#c8f0d4", "#ffd6a5", "#b8d4f5", "#f9c0c0"] as const).map((color, i) => (
              <div
                key={i}
                className="flex items-center justify-center text-sm"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: color,
                  border: "2px solid #f5f2ec",
                  marginLeft: i > 0 ? "-10px" : 0,
                }}
              >
                {["🏒", "🏊", "🏋️", "⛸️"][i]}
              </div>
            ))}
          </div>
          <div>
            <div className="text-sm font-bold text-brand">33,000+ drop-in sessions</div>
            <div className="text-xs text-gray-500">across all Toronto districts</div>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <div className="text-sm font-bold text-brand">500+ facilities</div>
            <div className="text-xs text-gray-500">community centres &amp; arenas</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes heroPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
