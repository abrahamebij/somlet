import { SDK } from "@somnia-chain/reactivity";
import {
  createPublicClient,
  webSocket,
  defineChain,
  encodeFunctionData,
  erc721Abi,
  decodeEventLog,
  erc20Abi,
  decodeFunctionResult,
} from "viem";

const somniaTestnet = defineChain({
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

const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: webSocket(),
});

export const sdk = new SDK({ public: publicClient });

export const subscription = async () => {

  await sdk.subscribe({
    ethCalls: [],
    onData: (data) => {
      // const decodedLog = decodeEventLog({
      //   abi: erc20Abi, // Or your custom ABI
      //   topics: data.result.topics,
      //   data: data.result.data,
      // });
      return data
// if (data.result.simulationResults.length === 0) {
//   console.warn("No simulation results available for this event.");
//   return;
// }
//       const decodedFunctionResult = decodeFunctionResult({
//         abi: erc721Abi, // Match the call's ABI
//         functionName: "balanceOf",
//         data: data.result.simulationResults[0], // First call's result
//       });

//       return decodedFunctionResult

      // console.log('Decoded Event:', decodedLog); // e.g., { eventName: 'Transfer', args: { from, to, value } }
      // console.log("Decoded Balance:", decodedFunctionResult); // e.g., 42n
    },

  })
}

