import { SomniaEvent, EVENT_COLORS, EVENT_LABELS } from '../types';

interface EventSidebarProps {
  event: SomniaEvent | null;
  totalCount: number;
  recentEvents: SomniaEvent[];
  wsStatus: 'connecting' | 'connected' | 'error';
}

function shorten(str: string, head = 6, tail = 4) {
  if (!str || str === '0x') return '—';
  if (str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const STATUS_COLOR = {
  connecting: '#ffaa00',
  connected:  '#00e5c0',
  error:      '#ff4d4d',
};
const STATUS_LABEL = {
  connecting: 'Connecting…',
  connected:  'Live · Somnia Testnet',
  error:      'Connection failed',
};

function Badge({ type }: { type: SomniaEvent['type'] }) {
  const color = EVENT_COLORS[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-widest"
      style={{ color, background: `${color}18`, border: `1px solid ${color}38` }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {EVENT_LABELS[type]}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid #0f0f1e' }}>
      <div className="text-[9px] font-mono uppercase tracking-[0.15em] mb-1" style={{ color: '#30304a' }}>{label}</div>
      <div className="font-mono text-xs break-all leading-relaxed" style={{ color: '#8a88b8' }}>
        {value || '—'}
      </div>
    </div>
  );
}

function TopicRow({ topic, index }: { topic: string; index: number }) {
  return (
    <div className="flex items-start gap-2 py-1.5" style={{ borderBottom: '1px solid #0f0f1e' }}>
      <span
        className="shrink-0 mt-0.5 font-mono text-[9px] px-1.5 py-0.5 rounded"
        style={{ background: '#6c47ff1a', color: '#6c47ff99', border: '1px solid #6c47ff28' }}
      >
        T{index}
      </span>
      <span className="font-mono text-[10px] break-all leading-relaxed" style={{ color: '#3e3e60' }}>
        {topic}
      </span>
    </div>
  );
}

export default function EventSidebar({ event, totalCount, recentEvents, wsStatus }: EventSidebarProps) {
  const statusColor = STATUS_COLOR[wsStatus];

  return (
    <aside
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ background: '#06060f', borderLeft: '1px solid #0f0f1e' }}
    >

      {/* ── Header ── */}
      <div className="px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #0f0f1e' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#f0eeff' }}>
            Somlet Inspector
          </span>
          <span className="font-mono text-lg font-bold" style={{ color: '#6c47ff' }}>
            {totalCount.toLocaleString()}
          </span>
        </div>
        {/* Status pill */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg w-full"
          style={{ background: `${statusColor}0d`, border: `1px solid ${statusColor}28` }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              background: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
              animation: wsStatus === 'connecting' ? 'blink 1.2s ease-in-out infinite' : undefined,
            }}
          />
          <span className="font-mono text-[10px]" style={{ color: statusColor }}>
            {STATUS_LABEL[wsStatus]}
          </span>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Error state */}
        {wsStatus === 'error' && (
          <div className="px-5 py-6 flex flex-col items-center text-center gap-2">
            <div className="text-2xl">⚠️</div>
            <p className="font-mono text-xs" style={{ color: '#ff4d4d88' }}>
              Could not reach Somnia.<br />Check your connection.
            </p>
          </div>
        )}

        {/* Selected event */}
        {event ? (
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-5">
              <Badge type={event.type} />
              <span className="font-mono text-[10px]" style={{ color: '#28284a' }}>{timeAgo(event.timestamp)}</span>
            </div>

            <Field label="Tx Hash" value={shorten(event.hash, 10, 8)} />
            <Field label="From"    value={shorten(event.from, 10, 8)} />
            <Field label="To"      value={shorten(event.to, 10, 8)} />
            <Field label="Block"   value={`#${event.blockNumber.toLocaleString()}`} />
            {event.gasUsed        && <Field label="Gas"      value={parseInt(event.gasUsed).toLocaleString()} />}
            {event.contractAddress && <Field label="Contract" value={shorten(event.contractAddress, 10, 8)} />}

            {/* Topics */}
            {event.topics.length > 0 && (
              <div className="mt-5">
                <div className="text-[9px] font-mono uppercase tracking-[0.15em] mb-2" style={{ color: '#30304a' }}>
                  Event Topics ({event.topics.length})
                </div>
                <div className="rounded-lg px-3 py-1" style={{ background: '#0b0b18', border: '1px solid #0f0f1e' }}>
                  {event.topics.map((t, i) => <TopicRow key={i} topic={t} index={i} />)}
                </div>
              </div>
            )}

            {/* Full hash */}
            <div className="mt-4 rounded-lg px-3 py-3" style={{ background: '#0b0b18', border: '1px solid #0f0f1e' }}>
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] mb-1.5" style={{ color: '#30304a' }}>Full Hash</div>
              <div className="font-mono text-[10px] break-all leading-relaxed" style={{ color: '#2e2e50' }}>{event.hash}</div>
            </div>
          </div>
        ) : wsStatus !== 'error' && (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
              style={{ background: '#6c47ff0f', border: '1px solid #6c47ff22' }}
            >
              🐔
            </div>
            <p className="font-mono text-xs mb-1" style={{ color: '#2e2e50' }}>No chicken selected</p>
            <p className="font-mono text-[10px]" style={{ color: '#1c1c36' }}>Click a Somlet to inspect</p>
          </div>
        )}

        {/* ── Live feed ── */}
        {recentEvents.length > 0 && (
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 my-4">
              <div className="h-px flex-1" style={{ background: '#0f0f1e' }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color: '#1e1e38' }}>Live Feed</span>
              <div className="h-px flex-1" style={{ background: '#0f0f1e' }} />
            </div>
            <div className="flex flex-col gap-1">
              {recentEvents.slice(0, 12).map((evt) => {
                const color = EVENT_COLORS[evt.type];
                return (
                  <div
                    key={evt.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                    style={{ background: '#0b0b18', border: '1px solid #0f0f1e' }}
                  >
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
                    <span className="font-mono text-[10px] flex-1 truncate" style={{ color: '#3a3a5e' }}>
                      {shorten(evt.hash || evt.id, 8, 6)}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wide shrink-0" style={{ color }}>
                      {EVENT_LABELS[evt.type]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid #0f0f1e' }}>
        <span className="font-mono text-[10px]" style={{ color: '#1e1e38' }}>
          @somnia-chain/reactivity
        </span>
        <style>{`
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }
        `}</style>
      </div>
    </aside>
  );
}