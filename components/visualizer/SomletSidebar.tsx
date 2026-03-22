/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  useSomletStore,
  type Somlet,
  type SomniaEvent,
} from "@/store/useSomletStore";
import { decodeTopic } from "@/lib/topicDecoder";

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(str: string, head = 6, tail = 4) {
  if (!str || str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// Decode a 32-byte topic as an address (last 20 bytes)
function topicToAddress(topic: string): string | null {
  if (!topic || topic.length < 66) return null;
  const raw = topic.slice(-40);
  if (raw === "0".repeat(40)) return null;
  return `0x${raw}`;
}

// Decode a 32-byte topic as a uint256 — very large numbers returned as hex
function topicToUint(topic: string): string | null {
  if (!topic || topic.length < 66) return null;
  try {
    const val = BigInt(topic);
    if (val < BigInt("1000000000000000000000000")) return val.toString();
    return topic;
  } catch {
    return null;
  }
}

// Extract transfer amount from topics[3] or data field
function extractAmount(topics: string[], data: string): string | null {
  // ERC-20 Transfer: amount is in topics[3] if indexed, otherwise in data
  const raw = topics[3] ?? (data !== "0x" ? data : null);
  if (!raw) return null;
  try {
    const val = BigInt(raw);
    if (val === BigInt(0)) return null;
    // Format with 18 decimal places (standard ERC-20) if large enough
    const str = val.toString();
    if (str.length > 18) {
      const whole = str.slice(0, str.length - 18) || "0";
      const frac = str
        .slice(str.length - 18)
        .replace(/0+$/, "")
        .slice(0, 4);
      return frac ? `${whole}.${frac}` : whole;
    }
    return str;
  } catch {
    return null;
  }
}

// ── Decoded event cache ───────────────────────────────────────────────────────
// Maps topic[0] hash → { eventName, signature }
const decodedCache = new Map<
  string,
  { eventName: string; signature: string | null }
>();

function useDecodedEvent(topics: string[]) {
  const [decoded, setDecoded] = useState<{
    eventName: string;
    signature: string | null;
  } | null>(null);

  useEffect(() => {
    if (!topics.length) return;
    const hash = topics[0];

    if (decodedCache.has(hash)) {
      setDecoded(decodedCache.get(hash)!);
      return;
    }

    decodeTopic(hash).then(
      (result: { eventName: string; signature: string | null }) => {
        decodedCache.set(hash, result);
        setDecoded(result);
      },
    );
  }, [topics[0]]);

  return decoded;
}

// ── Event name badge colour ───────────────────────────────────────────────────
const EVENT_COLOURS: Record<string, string> = {
  Transfer: "bg-accent text-background",
  Approval: "bg-phosphor text-background",
  Swap: "bg-[#f0a03a] text-background",
  Sync: "bg-[#3a6ef0] text-foreground",
  Mint: "bg-[#3af05a] text-background",
  Burn: "bg-danger text-background",
  TransferSingle: "bg-accent text-background",
  TransferBatch: "bg-accent text-background",
  OwnershipTransferred: "bg-[#a03af0] text-foreground",
};

function eventBadgeClass(name: string) {
  return (
    EVENT_COLOURS[name] ??
    "bg-surface-raised text-foreground-muted border border-border"
  );
}

// ── Corner accent ─────────────────────────────────────────────────────────────

function CornerAccent({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const classes = {
    tl: "top-0 left-0 border-t border-l",
    tr: "top-0 right-0 border-t border-r",
    bl: "bottom-0 left-0 border-b border-l",
    br: "bottom-0 right-0 border-b border-r",
  }[position];
  return (
    <div
      className={`absolute w-3 h-3 border-accent ${classes}`}
      style={{ margin: "-1px" }}
    />
  );
}

// ── Data row ──────────────────────────────────────────────────────────────────

function DataRow({
  label,
  value,
  accent = false,
  delay = 0,
  mono = true,
}: {
  label: string;
  value: string;
  accent?: boolean;
  delay?: number;
  mono?: boolean;
}) {
  return (
    <div
      className="animate-fade-in-up flex flex-col gap-0.5 py-3 border-b border-border-subtle last:border-0"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <span className="text-[10px] tracking-[0.2em] uppercase text-foreground-faint font-mono">
        {label}
      </span>
      <span
        className={`text-xs break-all leading-relaxed ${mono ? "font-mono" : "font-body"} ${accent ? "text-accent" : "text-foreground-muted"}`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionDivider({
  label,
  delay = 0,
}: {
  label: string;
  delay?: number;
}) {
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
  const decoded = useDecodedEvent(result.topics);

  const eventName =
    decoded?.eventName ?? truncate(result.topics[0] ?? "UNKNOWN", 10, 0);
  const signature = decoded?.signature ?? null;

  const sender = result.topics[1] ? topicToAddress(result.topics[1]) : null;
  const receiver = result.topics[2] ? topicToAddress(result.topics[2]) : null;
  const amount = extractAmount(result.topics, result.data);

  return (
    <div key={somlet.id} className="flex-1 overflow-y-auto px-4 py-4">
      {/* Event name badge */}
      <div
        className="animate-fade-in-up mb-4"
        style={{ animationDelay: "0ms", opacity: 0 }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative inline-flex items-center px-3 py-1.5 border border-accent bg-card">
            <CornerAccent position="tl" />
            <CornerAccent position="br" />
            <span
              className={`text-[11px] tracking-[0.15em] uppercase font-mono font-bold px-1.5 py-0.5 rounded-sm mr-2 ${eventBadgeClass(eventName)}`}
            >
              {eventName}
            </span>
          </div>
          {signature && (
            <span className="text-[10px] font-mono text-foreground-faint break-all">
              {signature}
            </span>
          )}
        </div>
      </div>

      {/* Sender → Receiver + Amount */}
      {(sender || receiver || amount) && (
        <>
          <SectionDivider label="Participants" delay={70} />
          <div
            className="animate-fade-in-up border border-border bg-card mb-4 px-3"
            style={{ animationDelay: "80ms", opacity: 0 }}
          >
            {sender && (
              <div className="flex flex-col gap-0.5 py-2.5 border-b border-border-subtle">
                <span className="text-[10px] tracking-[0.2em] uppercase text-foreground-faint font-mono">
                  FROM
                </span>
                <span className="text-xs font-mono text-foreground-muted break-all">
                  {sender}
                </span>
              </div>
            )}
            {receiver && (
              <div
                className={`flex flex-col gap-0.5 py-2.5 ${amount ? "border-b border-border-subtle" : ""}`}
              >
                <span className="text-[10px] tracking-[0.2em] uppercase text-foreground-faint font-mono">
                  TO
                </span>
                <span className="text-xs font-mono text-accent break-all">
                  {receiver}
                </span>
              </div>
            )}
            {amount && (
              <div className="flex flex-col gap-0.5 py-2.5">
                <span className="text-[10px] tracking-[0.2em] uppercase text-foreground-faint font-mono">
                  AMOUNT
                </span>
                <span className="text-sm font-mono font-bold text-accent">
                  {amount} STT
                </span>
              </div>
            )}
          </div>
        </>
      )}

      <SectionDivider label="Event Data" delay={80} />

      <div className="border border-border bg-card mb-4">
        <DataRow
          label="Contract Address"
          value={result.address}
          accent
          delay={100}
        />
        <DataRow
          label="Subscription"
          value={somlet.event.subscription}
          delay={130}
        />
        {result.data !== "0x" && (
          <DataRow label="Data" value={result.data} delay={160} />
        )}
      </div>

      {/* Topics */}
      {result.topics.length > 0 && (
        <>
          <SectionDivider
            label={`Topics (${result.topics.length})`}
            delay={180}
          />
          <div className="border border-border bg-card px-3 mb-4 divide-y divide-border-subtle">
            {result.topics.map((topic, i) => (
              <div
                key={i}
                className="animate-fade-in-up flex flex-col gap-0.5 py-2.5"
                style={{ animationDelay: `${200 + i * 40}ms`, opacity: 0 }}
              >
                <span className="text-[10px] tracking-[0.15em] uppercase text-foreground-faint font-mono">
                  {i === 0
                    ? "SIGNATURE"
                    : i === 1
                      ? "FROM"
                      : i === 2
                        ? "TO"
                        : `TOPIC[${i}]`}
                </span>
                <span className="text-[11px] font-mono text-foreground-muted break-all leading-relaxed">
                  {i === 0 && decoded?.signature ? (
                    <span className="text-accent">{decoded.signature}</span>
                  ) : (
                    topic
                  )}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Simulation */}
      {result.simulationResults.length > 0 && (
        <>
          <SectionDivider label="Simulation" delay={300} />
          <div
            className="animate-fade-in-up border border-border bg-card px-3 py-3 mb-4"
            style={{ animationDelay: "320ms", opacity: 0 }}
          >
            <pre className="text-[11px] font-mono text-foreground-muted whitespace-pre-wrap break-all">
              {JSON.stringify(result.simulationResults, null, 2)}
            </pre>
          </div>
        </>
      )}

      {/* Raw payload */}
      <details
        className="animate-fade-in-up group border border-border bg-card"
        style={{ animationDelay: "340ms", opacity: 0 }}
      >
        <summary className="px-3 py-2.5 text-[10px] tracking-[0.2em] uppercase font-mono text-foreground-faint cursor-crosshair hover:text-accent transition-colors duration-200 list-none flex items-center justify-between">
          RAW PAYLOAD
          <span className="group-open:rotate-180 transition-transform duration-200">
            ▾
          </span>
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

// ── Feed row ──────────────────────────────────────────────────────────────────

function FeedRow({
  somlet,
  isSelected,
  onSelect,
}: {
  somlet: Somlet;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const result = somlet.event.result;
  const decoded = useDecodedEvent(result.topics);
  const eventName =
    decoded?.eventName ?? truncate(result.topics[0] ?? "?", 8, 0);
  const sender = result.topics[1] ? topicToAddress(result.topics[1]) : null;
  const receiver = result.topics[2] ? topicToAddress(result.topics[2]) : null;
  const amount = extractAmount(result.topics, result.data);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 border-b border-border-subtle transition-colors duration-150 cursor-crosshair flex items-start gap-2.5 group
        ${isSelected ? "bg-card border-l-2 border-l-accent" : "hover:bg-card border-l-2 border-l-transparent"}`}
    >
      {/* Event name badge */}
      <span
        className={`shrink-0 mt-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${eventBadgeClass(eventName)}`}
      >
        {eventName}
      </span>

      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        {/* Sender → receiver */}
        {sender && receiver ? (
          <span className="text-[10px] font-mono text-foreground-muted truncate">
            {truncate(sender, 6, 4)}
            <span className="text-foreground-faint mx-1">→</span>
            {truncate(receiver, 6, 4)}
          </span>
        ) : (
          <span className="text-[10px] font-mono text-foreground-muted truncate">
            {truncate(result.address, 10, 6)}
          </span>
        )}
        {/* Amount */}
        {amount && (
          <span className="text-[10px] font-mono font-bold text-accent">
            {amount}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Live feed panel ───────────────────────────────────────────────────────────

// Cache decoded event names for filtering
const nameCache = new Map<string, string>();

function FeedPanel() {
  const { somlets, selectSomlet, selectedSomlet } = useSomletStore();
  const feedRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const [activeFilter, setFilter] = useState<string>("All");
  const [filterCounts, setCounts] = useState<Record<string, number>>({});

  // Build filter counts as events come in
  useEffect(() => {
    const counts: Record<string, number> = { All: somlets.length };
    const promises = somlets.map(async (s) => {
      const hash = s.event.result.topics[0];
      if (!hash) return;
      let name = nameCache.get(hash);
      if (!name) {
        const d = await decodeTopic(hash);
        name = d.eventName;
        nameCache.set(hash, name);
      }
      counts[name] = (counts[name] ?? 0) + 1;
    });
    Promise.all(promises).then(() => setCounts({ ...counts }));
  }, [somlets.length]);

  const handleScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  useEffect(() => {
    if (pinned && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [somlets.length, pinned]);

  useEffect(() => {
    if (feedRef.current)
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, []);

  // Known filter tabs — only show tabs that have events
  const knownFilters = [
    "All",
    "Transfer",
    "Approval",
    "Swap",
    "Sync",
    "Mint",
    "Burn",
  ];
  const activeFilters = knownFilters.filter(
    (f) => f === "All" || (filterCounts[f] ?? 0) > 0,
  );

  const recent = somlets.slice(-80);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filter tabs */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-border-subtle overflow-x-auto">
        {activeFilters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono tracking-wider uppercase rounded-sm transition-colors duration-150 cursor-crosshair
              ${
                activeFilter === f
                  ? "bg-accent text-background"
                  : "text-foreground-faint hover:text-foreground-muted border border-border"
              }`}
          >
            {f}
            {filterCounts[f] > 0 && (
              <span
                className={`text-[8px] tabular-nums ${activeFilter === f ? "opacity-70" : "opacity-50"}`}
              >
                {filterCounts[f]}
              </span>
            )}
          </button>
        ))}

        <div className="flex-1" />
        <button
          onClick={() => {
            if (!pinned && feedRef.current) {
              feedRef.current.scrollTop = feedRef.current.scrollHeight;
              setPinned(true);
            }
          }}
          className={`shrink-0 text-[9px] font-mono tracking-widest uppercase transition-colors duration-200 cursor-crosshair ${
            pinned ? "text-accent" : "text-foreground-faint hover:text-accent"
          }`}
        >
          {pinned ? "● LIVE" : "○ LATEST"}
        </button>
      </div>

      {/* Feed rows */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {recent.map((somlet) => (
          <FeedRow
            key={somlet.id}
            somlet={somlet}
            isSelected={selectedSomlet?.id === somlet.id}
            onSelect={() => selectSomlet(somlet.id)}
          />
        ))}
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
          <ellipse
            cx="24"
            cy="30"
            rx="13"
            ry="11"
            fill="currentColor"
            opacity="0.4"
          />
          <circle cx="24" cy="14" r="8" fill="currentColor" opacity="0.4" />
          <path
            d="M20 7 Q22 3 24 6 Q26 2 28 5 Q30 1 31 6"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.4"
          />
          <circle cx="27" cy="13" r="1.5" fill="var(--color-background)" />
          <circle
            cx="27.5"
            cy="12.5"
            r="0.5"
            fill="var(--color-foreground-faint)"
          />
          <path
            d="M30 16 L34 15 L30 18 Z"
            fill="var(--color-foreground-faint)"
            opacity="0.4"
          />
          <path
            d="M18 40 L16 44 M18 40 L20 44 M18 40 L18 44"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M28 40 L26 44 M28 40 L30 44 M28 40 L28 44"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
        <div className="absolute inset-0 rounded-full border border-foreground-faint opacity-10 animate-ping" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-foreground-faint font-mono">
          NO SOMLET SELECTED
        </p>
        <p className="text-[11px] text-foreground-faint font-body leading-relaxed">
          Click a Somlet in the world
          <br />
          or select one from the feed.
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

  useEffect(() => {
    if (selectedSomlet) setActiveTab("inspector");
  }, [selectedSomlet?.id]);

  return (
    <aside className="relative flex flex-col h-full bg-surface border-l border-border overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-surface-raised">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${somlets.length > 0 ? "bg-accent animate-pulse-glow" : "bg-foreground-faint"}`}
            />
            <span className="text-[10px] tracking-[0.25em] uppercase font-mono text-foreground-muted">
              EVENT STREAM
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
                ${
                  activeTab === tab
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

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "feed" ? (
          <FeedPanel />
        ) : selectedSomlet ? (
          <InspectorPanel somlet={selectedSomlet} />
        ) : (
          <EmptyInspector />
        )}
      </div>

      {/* Footer */}
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
