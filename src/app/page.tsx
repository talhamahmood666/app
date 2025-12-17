import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">BulwarkX</h1>
        <p className="mt-3 text-white/70">
          Escrow Without Custody. Commerce Without Fear.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/demo"
            className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90"
          >
            Open Grant Demo
          </Link>

          <a
            href="https://sepolia.basescan.org/address/0xd08830035fc062b67bCD5a5d12B270B5D8E09d6f"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
          >
            Contract on BaseScan
          </a>
        </div>

        <div className="mt-10 text-xs text-white/50">
          Tip: For the live flow, go to <span className="text-white/70">/demo</span>.
        </div>
      </div>
    </main>
  );
}
