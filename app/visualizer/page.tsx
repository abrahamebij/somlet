"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { sdk } from "@/lib/somnia";
import { useSomletStore } from "@/store/useSomletStore";
import { SomletSidebar } from "@/components/visualizer/SomletSidebar";
import { toast } from "sonner";

const SomletGame = dynamic(() => import("@/components/visualizer/SomletGame"), {
  ssr: false,
});

const Visualizer = () => {
  const addEvent = useSomletStore((s) => s.addEvent);
  const gameReady = useSomletStore((s) => s.gameReady);

  useEffect(() => {
    // Don't subscribe until Phaser has finished building the world
    if (!gameReady) return;

    let cancelled = false;

    const setupSubscription = async () => {
      try {
        await sdk.subscribe({
          ethCalls: [],
          onData: (data) => {
            if (!cancelled) addEvent(data);
          },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Failed to connect to Somnia WebSocket:", error);
        toast.error("Failed to connect to Somnia WebSocket");
      }
    };

    setupSubscription();

    // Cancel in-flight events if the component unmounts mid-stream
    return () => {
      cancelled = true;
    };
  }, [gameReady, addEvent]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Game world (left) ───────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <SomletGame />
      </div>

      {/* ── Sidebar (right) ─────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 h-full">
        <SomletSidebar />
      </div>
    </div>
  );
};

export default Visualizer;