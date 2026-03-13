"use client";

import { useState, useEffect, useRef } from "react";
import { useSomletStore, type Somlet } from "@/store/useSomletStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(str: string, head = 6, tail = 4) {
  if (str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function deriveEventType(topics: string[]): string {
  if (!topics.length) return "UNKNOWN";
  return `0x${topics[0].slice(2, 10).toUpperCase()}`;
}

// ── Corner accent ─────────────────────────────────────────────────────────────

function CornerAccent({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const classes = {
    tl: "top-0 left-0 border-t border-l",
    tr: "top-0 right-0 border-t border-r",
    bl: "bottom-0 left-0 border-b border-l",
    br: "bottom-0 right-0 border-b border-r",
  }[position];
  return <div className={`absolute w-3 h-3 border-accent ${classes}`} style={{ margin: "-1px" }} />;
}

// ── Data row ──────────────────────────────────────────────────────────────────

function DataRow({
  label,
  value,
  accent = false,
  delay = 0,
}: {
  label: string;
  value: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <div
      className="animate-fade-in-up flex flex-col gap-0.5 py-3 border-b border-border-subtle last:border-0"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <span className="text-[10px] tracking-[0.2em] uppercase text-foreground-faint font-mono">
        {label}
      </span>
      <span className={`text-xs break-all leading-relaxed font-mono ${accent ? "text-accent" : "text-foreground-muted"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <div
      className="animate-fade-in-up flex items-center gap-3 mb-3"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <span className="text-[9px] tracking-[0.3em] uppercase font-mono text-foreground-faint shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  );
}

// ── Inspector panel ───────────────────────────────────────────────────────────

function InspectorPanel({ somlet }: { somlet: Somlet }) {
  const result = somlet.event.result;
  const eventType = deriveEventType(result.topics);

  // Re-key on somlet id so animations replay on each new selection
  return (
    <div key={somlet.id} className="flex-1 overflow-y-auto px-4 py-4">

      {/* Event type badge */}
      <div
        className="animate-fade-in-up mb-5"
        style={{ animationDelay: "0ms", opacity: 0 }}
      >
        <div className="relative inline-flex items-center px-3 py-1.5 border border-accent bg-card">
          <CornerAccent position="tl" />
          <CornerAccent position="br" />
          <span className="text-[11px] tracking-[0.2em] uppercase font-mono text-accent">
            EVT_{eventType}
          </span>
        </div>
      </div>

      {/* Spawn time + id */}
      <div
        className="animate-fade-in-up flex items-center gap-3 mb-5 text-[10px] font-mono text-foreground-faint tracking-widest uppercase"
        style={{ animationDelay: "60ms", opacity: 0 }}
      >
        <span>{timeAgo(somlet.spawnedAt)}</span>
        <span className="text-border-subtle">·</span>
        <span>{truncate(somlet.id, 10, 4)}</span>
      </div>

      <SectionDivider label="Event Data" delay={80} />

      {/* Core fields */}
      <div className="border border-border bg-card mb-5">
        <DataRow label="Contract Address" value={result.address} accent delay={100} />
        <DataRow label="Subscription"     value={somlet.event.subscription} delay={140} />
        <DataRow
          label="Raw Data"
          value={result.data === "0x" ? "0x  (empty)" : result.data}
          delay={180}
        />
      </div>

      {/* Topics */}
      {result.topics.length > 0 && (
        <>
          <SectionDivider label={`Topics (${result.topics.length})`} delay={200} />
          <div className="border border-border bg-card px-3 mb-5 divide-y divide-border-subtle">
            {result.topics.map((topic, i) => (
              <div
                key={i}
                className="animate-fade-in-up flex flex-col gap-0.5 py-2.5"
                style={{ animationDelay: `${220 + i * 40}ms`, opacity: 0 }}
              >
                <span className="text-[10px] tracking-[0.15em] uppercase text-foreground-faint font-mono">
                  TOPIC[{i}]
                </span>
                <span className="text-[11px] font-mono text-foreground-muted break-all leading-relaxed">
                  {topic}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionDivider label="Simulation" delay={320} />

      <div
        className="animate-fade-in-up border border-border bg-card px-3 py-3 mb-5"
        style={{ animationDelay: "340ms", opacity: 0 }}
      >
        {result.simulationResults.length === 0 ? (
          <span className="text-[11px] font-mono text-foreground-faint">— no simulation results</span>
        ) : (
          <pre className="text-[11px] font-mono text-foreground-muted whitespace-pre-wrap break-all">
            {JSON.stringify(result.simulationResults, null, 2)}
          </pre>
        )}
      </div>

      {/* Raw payload collapsible */}
      <details
        className="animate-fade-in-up group border border-border bg-card"
        style={{ animationDelay: "380ms", opacity: 0 }}
      >
        <summary className="px-3 py-2.5 text-[10px] tracking-[0.2em] uppercase font-mono text-foreground-faint cursor-crosshair hover:text-accent transition-colors duration-200 list-none flex items-center justify-between">
          RAW PAYLOAD
          <span className="group-open:rotate-180 transition-transform duration-200">▾</span>
        </summary>
        <div className="border-t border-border px-3 py-3">
          <pre className="text-[10px] font-mono text-foreground-faint whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(somlet.event, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

// ── Live feed panel ───────────────────────────────────────────────────────────

function FeedPanel() {
  const { somlets, selectSomlet, selectedSomlet } = useSomletStore();
  const feedRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);

  // Detect user scrolling up → unpin; scrolling back to bottom → re-pin
  const handleScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Re-pin automatically if they scroll back to within 40px of the bottom
    setPinned(distanceFromBottom < 40);
  };

  // Auto-scroll to bottom when new somlets arrive, only if pinned
  useEffect(() => {
    if (pinned && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [somlets.length, pinned]);

  // Scroll to bottom on first mount
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, []);

  // Newest at bottom — natural order, no reverse
  const recent = somlets.slice(-80);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Pin toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle shrink-0">
        <span className="text-[10px] font-mono text-foreground-faint tracking-widest uppercase">
          Latest {recent.length} events
        </span>
        <button
          onClick={() => {
            if (!pinned && feedRef.current) {
              feedRef.current.scrollTop = feedRef.current.scrollHeight;
              setPinned(true);
            }
          }}
          className={`text-[10px] font-mono tracking-widest uppercase transition-colors duration-200 cursor-crosshair ${
            pinned ? "text-accent" : "text-foreground-faint hover:text-accent"
          }`}
        >
          {pinned ? "● LIVE" : "○ JUMP TO LATEST"}
        </button>
      </div>

      {/* Feed rows */}
      <div ref={feedRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {recent.map((somlet) => {
          const isSelected = selectedSomlet?.id === somlet.id;
          const eventType = deriveEventType(somlet.event.result.topics);

          return (
            <button
              key={somlet.id}
              onClick={() => selectSomlet(somlet.id)}
              className={`w-full text-left px-4 py-2.5 border-b border-border-subtle transition-colors duration-150 cursor-crosshair flex items-start gap-3 group
                ${isSelected ? "bg-card border-l-2 border-l-accent" : "hover:bg-card border-l-2 border-l-transparent"}`}
            >
              {/* Pulse dot */}
              <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-accent opacity-60 group-hover:opacity-100 transition-opacity" />

              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono tracking-wider truncate ${isSelected ? "text-accent" : "text-foreground-muted"}`}>
                    EVT_{eventType}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-foreground-faint truncate">
                  {truncate(somlet.event.result.address, 10, 6)}
                </span>
                <span className="text-[9px] font-mono text-foreground-faint opacity-60">
                  {timeAgo(somlet.spawnedAt)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyInspector() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6 text-center">
      <div className="relative">
        <svg
          width="52"
          height="52"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-foreground-faint animate-float-chicken"
        >
          <ellipse cx="24" cy="30" rx="13" ry="11" fill="currentColor" opacity="0.4" />
          <circle cx="24" cy="14" r="8" fill="currentColor" opacity="0.4" />
          <path d="M20 7 Q22 3 24 6 Q26 2 28 5 Q30 1 31 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4" />
          <circle cx="27" cy="13" r="1.5" fill="var(--color-background)" />
          <circle cx="27.5" cy="12.5" r="0.5" fill="var(--color-foreground-faint)" />
          <path d="M30 16 L34 15 L30 18 Z" fill="var(--color-foreground-faint)" opacity="0.4" />
          <path d="M18 40 L16 44 M18 40 L20 44 M18 40 L18 44" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
          <path d="M28 40 L26 44 M28 40 L30 44 M28 40 L28 44" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
        </svg>
        <div className="absolute inset-0 rounded-full border border-foreground-faint opacity-10 animate-ping" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-foreground-faint font-mono">
          NO SOMLET SELECTED
        </p>
        <p className="text-[11px] text-foreground-faint font-body leading-relaxed">
          Click a Somlet in the world<br />or select one from the feed.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-foreground-faint animate-blink" />
        <span className="text-[9px] tracking-widest uppercase text-foreground-faint font-mono">
          AWAITING SELECTION
        </span>
      </div>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function SomletSidebar() {
  const { selectedSomlet, somlets, selectSomlet } = useSomletStore();
  const [activeTab, setActiveTab] = useState<"inspector" | "feed">("feed");

  // Switch to inspector automatically when a somlet is selected
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedSomlet) setActiveTab("inspector");
  }, [selectedSomlet?.id]);

  return (
    <aside className="relative flex flex-col h-full bg-surface border-l border-border overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border bg-surface-raised">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${somlets.length > 0 ? "bg-accent animate-pulse-glow" : "bg-foreground-faint"}`} />
            <span className="text-[10px] tracking-[0.25em] uppercase font-mono text-foreground-muted">
              SOMLET INSPECTOR
            </span>
          </div>
          {selectedSomlet && (
            <button
              onClick={() => selectSomlet(null)}
              className="text-[10px] tracking-widest uppercase font-mono text-foreground-faint hover:text-accent transition-colors duration-200 cursor-crosshair"
            >
              ✕ CLEAR
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex">
          {(["feed", "inspector"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-[10px] tracking-[0.2em] uppercase font-mono transition-colors duration-200 cursor-crosshair border-t
                ${activeTab === tab
                  ? "text-accent border-accent bg-card"
                  : "text-foreground-faint border-transparent hover:text-foreground-muted"
                }`}
            >
              {tab === "feed" ? (
                <span className="flex items-center justify-center gap-1.5">
                  LIVE FEED
                  {somlets.length > 0 && (
                    <span className="px-1 py-px bg-accent text-background text-[9px] font-mono rounded-sm tabular-nums">
                      {somlets.length > 999 ? "999+" : somlets.length}
                    </span>
                  )}
                </span>
              ) : (
                "INSPECTOR"
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "feed" ? (
          <FeedPanel />
        ) : selectedSomlet ? (
          <InspectorPanel somlet={selectedSomlet} />
        ) : (
          <EmptyInspector />
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2 border-t border-border bg-surface-raised flex items-center justify-between">
        <span className="text-[10px] font-mono text-foreground-faint tracking-widest uppercase">
          TOTAL SOMLETS
        </span>
        <span className="text-[11px] font-mono text-accent tabular-nums">
          {somlets.length.toLocaleString()}
        </span>
      </div>
    </aside>
  );
}