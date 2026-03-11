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
  name: "Somnia Testnet",
  network: "testnet",
  nativeCurrency: {
    decimals: 18,
    name: "STT",
    symbol: "STT",
  },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["ws://api.infra.testnet.somnia.network/ws"],
    },
    public: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["ws://api.infra.testnet.somnia.network/ws"],
    },
  },
});

const Visualizer = async () => {
  try {
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: webSocket(),
    });

    const sdk = new SDK({ public: publicClient });

    const ethCall = {
      to: "0x23B66B772AE29708a884cca2f9dec0e0c278bA2c", // Example Somnia ERC721 contract
      data: encodeFunctionData({
        abi: erc721Abi,
        functionName: "balanceOf",
        args: ["0x3dC360e0389683cA0341a11Fc3bC26252b5AF9bA"], // Example owner address
      }),
    };

    await sdk.subscribe({
      ethCalls: [],
      onData: (data) => {
        console.log('data: ', data);
        // const decodedLog = decodeEventLog({
        //   abi: erc20Abi, // Or your custom ABI
        //   topics: data.result.topics,
        //   data: data.result.data,
        // });

        // const decodedFunctionResult = decodeFunctionResult({
        //   abi: erc721Abi, // Match the call's ABI
        //   functionName: "balanceOf",
        //   data: data.result.simulationResults[0], // First call's result
        // });

        // // console.log('Decoded Event:', decodedLog); // e.g., { eventName: 'Transfer', args: { from, to, value } }
        // console.log("Decoded Balance:", decodedFunctionResult); // e.g., 42n
      },
    });
  } catch (error) {
    console.error("Failed to connect to Somnia WebSocket:", error);
  }

  return <div>Visualizer</div>;
};

export default Visualizer;
