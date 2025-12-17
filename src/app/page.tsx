"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { selectedChain } from "@/lib/wagmi";

export default function Home() {
  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">BulwarkX</h1>
          <p className="text-sm opacity-80">
            Escrow Without Custody. Commerce Without Fear.
          </p>
        </div>
        <ConnectButton />
      </div>

      <div className="mt-6 rounded-xl border p-4">
        <h2 className="font-semibold">Network</h2>
        <p className="text-sm mt-2">Chain ID: {selectedChain.id}</p>
        <p className="text-sm">Configured: {process.env.NEXT_PUBLIC_CHAIN}</p>
      </div>

      <div className="mt-8 text-sm opacity-80">
        Next steps: add contract ABI + address and call reads/writes with wagmi.
      </div>
    </main>
  );
}
