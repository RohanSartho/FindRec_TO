import { useState, useEffect } from "react";

const activities = ["Skating", "Swimming", "Fitness", "Aquatics", "Drop-ins", "Classes"];

export default function FindRecHero() {
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
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f5f2ec", minHeight: "100vh", overflow: "hidden", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,300&display=swap" rel="stylesheet" />

      {/* Decorative blobs */}
      <div style={{ position: "absolute", top: "-120px", right: "-100px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, #c8f0d4 0%, transparent 70%)", opacity: 0.7, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-60px", left: "-80px", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, #ffd6a5 0%, transparent 70%)", opacity: 0.6, pointerEvents: "none" }} />

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 48px", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", background: "#1a3a2a", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="8" r="3.5" stroke="#c8f0d4" strokeWidth="1.8" />
              <path d="M10 12.5C6.5 12.5 4 14.5 4 16.5" stroke="#c8f0d4" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10 12.5C13.5 12.5 16 14.5 16 16.5" stroke="#c8f0d4" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "18px", color: "#1a3a2a", letterSpacing: "-0.5px" }}>FindRec <span style={{ fontWeight: 300, fontStyle: "italic" }}>Toronto</span></span>
        </div>
        <div style={{ display: "flex", gap: "32px", fontSize: "14px", color: "#4a5568", fontWeight: 500 }}>
          {["Facilities", "Programs", "Map View", "About"].map(item => (
            <a key={item} href="#" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = "#1a3a2a"}
              onMouseLeave={e => e.target.style.color = "#4a5568"}>{item}</a>
          ))}
        </div>
        <button style={{ background: "#1a3a2a", color: "#c8f0d4", border: "none", padding: "10px 22px", borderRadius: "100px", fontSize: "14px", fontWeight: 600, cursor: "pointer", letterSpacing: "0.2px" }}>
          Explore Now →
        </button>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 48px 80px", position: "relative", zIndex: 5 }}>

        {/* Tag */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "100px", padding: "6px 16px 6px 10px", marginBottom: "32px", fontSize: "13px", color: "#2d6a4f", fontWeight: 600, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <span style={{ width: "8px", height: "8px", background: "#52b788", borderRadius: "50%", display: "inline-block", animation: "pulse 2s infinite" }} />
          Toronto's Free Recreation Finder
        </div>

        {/* Main headline */}
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(52px, 7vw, 88px)", fontWeight: 700, color: "#1a3a2a", lineHeight: 1.05, letterSpacing: "-2px", marginBottom: "12px", maxWidth: "820px" }}>
          Find your next<br />
          <span style={{ fontStyle: "italic", fontWeight: 300, color: "#2d6a4f", position: "relative" }}>
            <span style={{
              display: "inline-block",
              opacity: fading ? 1 : 0,
              transform: fading ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
              minWidth: "320px"
            }}>
              {activities[activityIndex]}
            </span>
          </span>{" "}
          session.
        </h1>

        {/* Subheadline */}
        <p style={{ fontSize: "18px", color: "#556b6e", lineHeight: 1.7, maxWidth: "560px", marginBottom: "48px", fontWeight: 400 }}>
          Every community centre, rink, pool, and gym across Toronto: drop-in schedules, real-time availability, and map-based search. Filter by date, time, or distance. Recreation made simple.
        </p>

        {/* CTA row */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <button style={{ background: "#1a3a2a", color: "#f5f2ec", padding: "16px 32px", borderRadius: "100px", border: "none", fontSize: "16px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 20px rgba(26,58,42,0.25)", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(26,58,42,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(26,58,42,0.25)"; }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="2" /><path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Search Activities
          </button>
          <button style={{ background: "transparent", color: "#1a3a2a", padding: "16px 28px", borderRadius: "100px", border: "2px solid #1a3a2a", fontSize: "16px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", transition: "background 0.2s, color 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#1a3a2a"; e.currentTarget.style.color = "#f5f2ec"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1a3a2a"; }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M6 9h6M9 6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            View Map
          </button>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "12px", marginTop: "48px", flexWrap: "wrap" }}>
          {[
            { icon: "📅", label: "Filter by Date & Time" },
            { icon: "📍", label: "Distance Search" },
            { icon: "🗺️", label: "Interactive Map" },
            { icon: "⚡", label: "Live Schedules" },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "100px", padding: "8px 18px", fontSize: "13px", fontWeight: 500, color: "#374151", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <span>{icon}</span> {label}
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div style={{ marginTop: "56px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex" }}>
            {["#c8f0d4", "#ffd6a5", "#b8d4f5", "#f9c0c0"].map((c, i) => (
              <div key={i} style={{ width: "36px", height: "36px", borderRadius: "50%", background: c, border: "2px solid #f5f2ec", marginLeft: i > 0 ? "-10px" : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                {["🏒", "🏊", "🏋️", "⛸️"][i]}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a3a2a" }}>33,000+ drop-in sessions</div>
            <div style={{ fontSize: "12px", color: "#718096" }}>across all Toronto districts</div>
          </div>
          <div style={{ width: "1px", height: "32px", background: "#e2e8f0" }} />
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a3a2a" }}>100+ facilities</div>
            <div style={{ fontSize: "12px", color: "#718096" }}>community centres & arenas</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
