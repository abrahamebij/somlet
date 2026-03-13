"use client";
import EventSidebar from "@/components/EventSidebar";
import { sdk } from "@/lib/somnia";
import {
  defineChain,
  encodeFunctionData,
  erc721Abi,
  decodeEventLog,
  erc20Abi,
  decodeFunctionResult,
} from "viem";

const Visualizer = () => {
  try {
    // const setupSubscription = async () => {
    //   await sdk.subscribe({
    //     ethCalls: [],
    //     onData: (data) => {
    //       console.log("data: ", data);
    //       // const decodedLog = decodeEventLog({
    //       //   abi: erc20Abi, // Or your custom ABI
    //       //   topics: data.result.topics,
    //       //   data: data.result.data,
    //       // });
    //       // console.log("data: ", data);
    //       // const decodedFunctionResult = decodeFunctionResult({
    //       //   abi: erc721Abi, // Match the call's ABI
    //       //   functionName: "balanceOf",
    //       //   data: data.result.simulationResults[0], // First call's result
    //       // });
    //       // // return decodedFunctionResult;
    //       // console.log("Decoded Event:", decodedLog); // e.g., { eventName: 'Transfer', args: { from, to, value } }
    //       // console.log("Decoded Balance:", decodedFunctionResult); // e.g., 42n
    //     },
    //   });
    // };
    // setupSubscription();
  } catch (error) {
    console.error("Failed to connect to Somnia WebSocket:", error);
  }

  return <div>{/* <EventSidebar /> */}</div>;
};

export default Visualizer;
