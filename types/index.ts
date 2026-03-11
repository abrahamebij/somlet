export interface SomniaEvent {
  id: string;
  type: 'transfer' | 'mint' | 'swap' | 'contract' | 'bridge' | 'stake' | 'unknown';
  hash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  value?: string;
  blockNumber: number;
  timestamp: number;
  gasUsed?: string;
  contractAddress?: `0x${string}`;
  tokenSymbol?: string;
  /** Raw event topics from the SubscriptionCallback */
  topics: string[];
  raw: Record<string, unknown>;
}

export interface Somlet {
  id: string;
  event: SomniaEvent;
  x: number;
  y: number;
  spawnedAt: number;
}

export type EventType = SomniaEvent['type'];

export const EVENT_COLORS: Record<EventType, string> = {
  transfer: '#6c47ff',
  mint:     '#00e5c0',
  swap:     '#ff8c47',
  contract: '#ff4d94',
  bridge:   '#47c8ff',
  stake:    '#a8ff47',
  unknown:  '#8b8aad',
};

export const EVENT_LABELS: Record<EventType, string> = {
  transfer: 'Transfer',
  mint:     'Mint',
  swap:     'Swap',
  contract: 'Contract Call',
  bridge:   'Bridge',
  stake:    'Stake',
  unknown:  'Unknown',
};