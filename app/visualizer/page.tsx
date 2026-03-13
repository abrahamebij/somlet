"use client";

import { useEffect } from "react";
import { sdk } from "@/lib/somnia";
import { useSomletStore } from "@/store/useSomletStore";
import { SomletSidebar } from "@/components/visualizer/SomletSidebar";
import { toast } from "sonner";

const Visualizer = () => {
  const addEvent = useSomletStore((s) => s.addEvent);

  useEffect(() => {
    const setupSubscription = async () => {
      try {
        await sdk.subscribe({
          ethCalls: [],
          onData: (data) => {
            addEvent(data);
          },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Failed to connect to Somnia WebSocket:", error);
        toast.error("Failed to connect to Somnia WebSocket:", error);
      }
    };

    // setupSubscription();
  }, [addEvent]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Phaser world (left) — placeholder until game is built ──────── */}
      <div className="flex-1 relative">
        {/* Game canvas will be mounted here by Phaser */}
        <div id="phaser-container" className="w-full h-full" />
      </div>

      {/* ── Sidebar (right) ─────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 h-full">
        <SomletSidebar />
      </div>
    </div>
  );
};

export default Visualizer;