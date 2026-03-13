"use client"
import { SDK } from "@somnia-chain/reactivity";
import {
  createPublicClient,
  webSocket,
  defineChain,
} from "viem";

export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  network: 'testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['ws://api.infra.testnet.somnia.network/ws'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['ws://api.infra.testnet.somnia.network/ws'],
    },
  },
});

export const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: webSocket(),
});

export const sdk = new SDK({ public: publicClient });

