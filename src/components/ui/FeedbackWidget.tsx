"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Bug,
  Check,
  Lightbulb,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

type Stage = "closed" | "menu" | "bug" | "feature" | "submitting" | "success";

const inputCls =
  "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand bg-white";
const labelCls =
  "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

export function FeedbackWidget() {
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage>("closed");
  const [type, setType] = useState<"bug" | "feature">("bug");
  // Once acknowledged (first open), ripple rings stop
  const [acknowledged, setAcknowledged] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("Low");
  const [email, setEmail] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setUrgency("Low");
    setEmail("");
    setScreenshot(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const open = (s: Stage, t?: "bug" | "feature") => {
    if (!acknowledged) setAcknowledged(true);
    if (t) {
      setType(t);
      setEmail(user?.email ?? "");
    }
    setStage(s);
  };

  const close = () => {
    setStage("closed");
    resetForm();
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) return;
    setStage("submitting");

    try {
      let screenshotUrl: string | undefined;

      if (screenshot) {
        const fd = new FormData();
        fd.append("file", screenshot);
        const r = await fetch("/api/feedback/upload", { method: "POST", body: fd });
        if (r.ok) screenshotUrl = (await r.json()).assetUrl;
      }

      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          urgency: type === "bug" ? urgency : undefined,
          email: email.trim() || undefined,
          pageUrl: window.location.href,
          screenshotUrl,
        }),
      });

      setStage("success");
      setTimeout(close, 2500);
    } catch {
      close();
    }
  };

  const isForm = stage === "bug" || stage === "feature";
  const isPanelOpen = stage !== "closed";

  const panelTitle: Record<Stage, string> = {
    closed: "",
    menu: "Send Feedback",
    bug: "Report a Bug",
    feature: "Suggest a Feature",
    submitting: "Submitting…",
    success: "Thank you!",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

      {/* ── Panel ───────────────────────────────────────────── */}
      {isPanelOpen && (
        <div className="mb-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-brand/20"
            style={{ background: "#1a3a2a" }}
          >
            <div className="flex items-center gap-1.5">
              {isForm && (
                <button
                  onClick={() => open("menu")}
                  className="text-white/60 hover:text-white transition mr-1"
                  aria-label="Back"
                >
                  <ArrowLeft size={15} />
                </button>
              )}
              <span
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-fraunces), serif" }}
              >
                {panelTitle[stage]}
              </span>
            </div>
            <button
              onClick={close}
              className="text-white/60 hover:text-white transition"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Menu ── */}
          {stage === "menu" && (
            <div className="divide-y divide-gray-50">
              <button
                onClick={() => open("bug", "bug")}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition text-left group"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(26,58,42,0.08)" }}
                >
                  <Bug size={17} style={{ color: "#1a3a2a" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Report a Bug</p>
                  <p className="text-xs text-gray-400">Help us fix issues</p>
                </div>
                <span className="text-gray-300 group-hover:text-gray-500 text-lg leading-none">›</span>
              </button>

              <button
                onClick={() => open("feature", "feature")}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition text-left group"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(26,58,42,0.08)" }}
                >
                  <Lightbulb size={17} style={{ color: "#1a3a2a" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Suggest a Feature</p>
                  <p className="text-xs text-gray-400">Share your ideas</p>
                </div>
                <span className="text-gray-300 group-hover:text-gray-500 text-lg leading-none">›</span>
              </button>
            </div>
          )}

          {/* ── Form ── */}
          {isForm && (
            <div className="p-4 space-y-3">
              {/* Title */}
              <div>
                <label className={labelCls}>
                  {type === "bug" ? "Bug Title" : "Feature Heading"} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === "bug" ? "Brief title" : "Give it a name"}
                  className={inputCls}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    type === "bug"
                      ? "Steps to reproduce, what you expected vs what happened…"
                      : "Describe the feature and why it would be useful…"
                  }
                  rows={4}
                  className={inputCls + " resize-none"}
                />
              </div>

              {/* Urgency — bug only */}
              {type === "bug" && (
                <div>
                  <label className={labelCls}>Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className={inputCls}
                  >
                    <option value="Low">Low — minor inconvenience</option>
                    <option value="Medium">Medium — blocks some tasks</option>
                    <option value="High">High — app is unusable</option>
                  </select>
                </div>
              )}

              {/* Screenshot */}
              <div>
                <label className={labelCls}>Screenshot (optional)</label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-2 border border-dashed border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-400 hover:border-brand hover:text-brand transition"
                >
                  <Paperclip size={13} />
                  <span className="truncate">
                    {screenshot ? screenshot.name : "Choose image…"}
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>

              {/* Submit */}
              <button
                onClick={submit}
                disabled={!title.trim() || !description.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ background: "#1a3a2a" }}
              >
                {type === "bug" ? "Submit Bug Report" : "Submit Idea"}
              </button>
            </div>
          )}

          {/* ── Submitting ── */}
          {stage === "submitting" && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={28} className="animate-spin" style={{ color: "#1a3a2a" }} />
            </div>
          )}

          {/* ── Success ── */}
          {stage === "success" && (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: "rgba(26,58,42,0.1)" }}
              >
                <Check size={24} style={{ color: "#1a3a2a" }} />
              </div>
              <p className="font-semibold text-gray-900 mb-1">Logged to our team!</p>
              <p className="text-sm text-gray-400">Thanks for helping make FindRec better.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Bubble ──────────────────────────────────────────── */}
      <div className="relative">
        {/* Sonar ripple rings — stop after first open */}
        {!acknowledged && (
          <>
            <div
              className="absolute inset-0 rounded-full pointer-events-none animate-ripple"
              style={{ background: "rgba(26,58,42,0.35)" }}
            />
            <div
              className="absolute inset-0 rounded-full pointer-events-none animate-ripple-delay"
              style={{ background: "rgba(26,58,42,0.22)" }}
            />
          </>
        )}

        <button
          onClick={() => (stage === "closed" ? open("menu") : close())}
          aria-label="Send feedback"
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ background: "#1a3a2a" }}
        >
          {stage === "closed" || stage === "success" ? (
            <MessageSquarePlus size={22} className="text-white" />
          ) : (
            <X size={20} className="text-white" />
          )}
        </button>
      </div>

    </div>
  );
}
