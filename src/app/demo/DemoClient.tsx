"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, isAddress, decodeEventLog, getAddress } from "viem";

import ABI from "../../contracts/BulwarkXEscrow.abi.json";
import { ESCROW_ADDRESSES } from "../../contracts/addresses";

function sameAddr(a?: string, b?: string) {
  if (!a || !b) return false;
  try {
    return getAddress(a) === getAddress(b);
  } catch {
    return a.toLowerCase() === b.toLowerCase();
  }
}


type Hex = `0x${string}`;

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function explorerBase(): string {
  return process.env.NEXT_PUBLIC_BASESCAN_BASE || "https://sepolia.basescan.org";
}
function linkTx(hash?: Hex | null) {
  if (!hash) return null;
  return `${explorerBase()}/tx/${hash}`;
}
function linkAddr(addr?: Hex | null) {
  if (!addr) return null;
  return `${explorerBase()}/address/${addr}`;
}

function prettyError(err: unknown): string {
  const msg = String((err as any)?.shortMessage || (err as any)?.message || err || "");
  return msg.replace("ContractFunctionExecutionError:", "").trim();
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function shortAddr(addr: string) {
  if (!addr) return "—";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function safeJsonPreview(data: any) {
  try {
    return JSON.stringify(
      data,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2
    ).slice(0, 2000);
  } catch {
    return String(data);
  }
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-white/70">{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
      />
      {props.hint && <div className="mt-1 text-[11px] text-white/45">{props.hint}</div>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-white/50">{label}</div>
      <div className="text-white/80">{value}</div>
    </div>
  );
}

export default function DemoClient() {
  const { address, isConnected } = useAccount();const contractAddress = ESCROW_ADDRESSES.baseSepolia as Hex;

  // Create escrow form
  const [payee, setPayee] = useState("");
  
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    const onErr = (e: any) => setRuntimeError(String(e?.message || e?.error?.message || e));
    const onRej = (e: any) => setRuntimeError(String(e?.reason?.message || e?.reason || e));
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);
const [arbiter, setArbiter] = useState("");
  const [amountEth, setAmountEth] = useState("0.001");
  const [autoReleaseMins, setAutoReleaseMins] = useState("60");
  const releaseTime = Math.floor(Date.now() / 1000) + (Number(autoReleaseMins || 0) * 60);

  const autoReleaseSeconds = useMemo(() => {
      const mins = Number(autoReleaseMins || "0");
      const clamped = Number.isFinite(mins) ? Math.max(0, mins) : 0;
      return Math.floor(clamped * 60);
    }, [autoReleaseMins]);

  // Escrow ID input
  const [escrowId, setEscrowId] = useState("");
  
  const escrowIdHex = (escrowId || "").trim();
  const escrowIdLooksValid = /^0x[0-9a-fA-F]{64}$/.test(escrowIdHex);

  const escrowRead = useReadContract({
    address: contractAddress,
    abi: ABI as any,
    functionName: "escrows",
    args: escrowIdLooksValid ? [escrowIdHex] : undefined,
    query: { enabled: escrowIdLooksValid, refetchInterval: 4000 },
  });

  const escrow = escrowRead.data as any;

  

  

  
  // --- BulwarkX action gating (roles + status) ---
  const userAddr = address as string | undefined;

  const st = Number((escrow as any)?.status ?? -1);

  const isFunded = st === 0;
  const isDisputed = st === 1;
  const isReleased = st === 2;
  const isRefunded = st === 3;
  const isFinal = isReleased || isRefunded;

  const payerAddr = (escrow as any)?.payer as string | undefined;
  const payeeAddr = (escrow as any)?.payee as string | undefined;
  const arbiterAddr = (escrow as any)?.arbiter as string | undefined;

  const isPayer = sameAddr(userAddr, payerAddr);
  const isPayee = sameAddr(userAddr, payeeAddr);
  const isArbiter = sameAddr(userAddr, arbiterAddr);

  // Allow arbiter to resolve disputes. (Funded = payer can release. Disputed = arbiter can release/refund.)
  const canRelease =
    !isFinal &&
    ((isFunded && isPayer) || (isDisputed && isArbiter));

  const canRefund =
    !isFinal &&
    (isDisputed && isArbiter);

  // Optional: who can open disputes (tweak if contract differs)
  const canDispute =
    !isFinal &&
    isFunded &&
    (isPayer || isPayee);  // --- end gating ---
const escrowExists = useMemo(() => {
    if (!escrow) return false;
  // DEBUG (safe): logs UI gating facts to console
  useEffect(() => {
    // avoid spamming when nothing loaded
    if (!address) return;
    console.log("[BulwarkX DEBUG]", {
      address,
      payer: (escrow as any)?.payer,
      payee: (escrow as any)?.payee,
      arbiter: (escrow as any)?.arbiter,
      status: (escrow as any)?.status?.toString?.(),
      escrowExists,
      isPayer,
      isPayee,
      isArbiter,
      canRelease,
      canRefund,
      canDispute,
      pending
    });
  }, [address, escrow, escrowExists, isPayer, isPayee, isArbiter, canRelease, canRefund, canDispute, pending]);


    const vals = Array.isArray(escrow) ? escrow : Object.values(escrow);
    const addrLike = vals.find((v) => typeof v === "string" && v.startsWith("0x") && v.length === 42);
    return Boolean(addrLike && addrLike !== "0x0000000000000000000000000000000000000000");
  }, [escrow]);

  const { writeContractAsync } = useWriteContract();

  const [lastTx, setLastTx] = useState<Hex | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const receipt = useWaitForTransactionReceipt({ hash: lastTx || undefined });

  // Try to auto-detect escrowId from logs
  useEffect(() => {
    if (!receipt.data || !receipt.isSuccess) return;
    if (escrowIdLooksValid) return;

    try {
      const logs = receipt.data.logs || [];
      for (const log of logs) {
        try {
          const decoded: any = decodeEventLog({
            abi: ABI as any,
            data: log.data,
            topics: log.topics,
          });
          const args = (decoded as any)?.args as Record<string, any> | undefined;
          if (args) {
            for (const key of Object.keys(args)) {
              const v = args[key];
              if (typeof v === "string" && v.startsWith("0x") && v.length === 66) {
                setEscrowId(v);
                setStatusMsg("Escrow ID detected from tx log ✅");
                return;
              }
            }
          }
        } catch {
          // ignore
        }
      }
      setStatusMsg("Tx confirmed ✅ (If escrowId didn't auto-fill, copy it from BaseScan logs.)");
    } catch {
      setStatusMsg("Tx confirmed ✅");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess, receipt.data]);

  const pending =
    receipt.isLoading ||
    receipt.isFetching ||
    statusMsg.toLowerCase().includes("waiting") ||
    statusMsg.toLowerCase().includes("submitting");

  async function handleCreateEscrow() {
    setErrorMsg("");
    setStatusMsg("");

    if (!isAddress(payee)) return setErrorMsg("Payee address is invalid.");
    if (!isAddress(arbiter)) return setErrorMsg("Arbiter address is invalid.");

    let value: bigint;
    try {
      value = parseEther(amountEth || "0");
      if (value <= 0n) return setErrorMsg("Amount must be > 0.");
    } catch {
      return setErrorMsg('Amount is invalid. Example: "0.01"');
    }

    try {
      setStatusMsg("Submitting create escrow transaction…");
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: ABI as any,
        functionName: "createEscrow",
        args: [payee as Hex, arbiter as Hex, value],
        value,
      });
      setLastTx(hash as Hex);
      setStatusMsg("Transaction submitted. Waiting for confirmation…");
    } catch (e) {
      setErrorMsg(prettyError(e));
      setStatusMsg("");
    }
  }

  async function handleRelease() {
    setErrorMsg("");
    setStatusMsg("");
    try {
      setStatusMsg("Submitting release…");
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: ABI as any,
        functionName: "releaseEscrow",
        args: [escrowIdHex],
      });
      setLastTx(hash as Hex);
      setStatusMsg("Release tx submitted. Waiting for confirmation…");
    } catch (e) {
      setErrorMsg(prettyError(e));
    }
  }

  async function handleRefund() {
    setErrorMsg("");
    setStatusMsg("");
    try {
      setStatusMsg("Submitting refund…");
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: ABI as any,
        functionName: "refundEscrow",
        args: [escrowIdHex],
      });
      setLastTx(hash as Hex);
      setStatusMsg("Refund tx submitted. Waiting for confirmation…");
    } catch (e) {
      setErrorMsg(prettyError(e));
    }
  }

  async function handleDispute() {
    setErrorMsg("");
    setStatusMsg("");
    try {
      setStatusMsg("Opening dispute…");
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: ABI as any,
        functionName: "openDispute",
        args: [escrowIdHex],
      });
      setLastTx(hash as Hex);
      setStatusMsg("Dispute tx submitted. Waiting for confirmation…");
    } catch (e) {
      setErrorMsg(prettyError(e));
    }
  }

  const canAct = isConnected && escrowIdLooksValid;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">BulwarkX Demo</h1>
          <p className="mt-1 text-sm text-white/70">
            Non-custodial escrow on Base Sepolia. Create escrow, then release/refund/dispute with full on-chain proof.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <ConnectButton />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Create */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">1) Create escrow (Native ETH)</h2>
            <a
              className="text-xs text-white/60 underline underline-offset-4 hover:text-white"
              href={linkAddr(contractAddress) || "#"}
              target="_blank"
              rel="noreferrer"
            >
              Contract on BaseScan
            </a>
          </div>

          <div className="mt-4 grid gap-4">
            <Field label="Payee address" value={payee} onChange={setPayee} placeholder="0x…" hint="Recipient who gets paid on release." />
            <Field label="Arbiter address" value={arbiter} onChange={setArbiter} placeholder="0x…" hint="Can resolve disputes." />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Amount (ETH)" value={amountEth} onChange={setAmountEth} placeholder="0.001" hint="Sent as msg.value" />
              <Field label="Auto-release (minutes from now)" value={autoReleaseMins} onChange={setAutoReleaseMins} placeholder="60" hint={`Seconds: `} />
            </div>

            <button
              onClick={handleCreateEscrow}
              disabled={!isConnected || pending}
              className={cx(
                "mt-2 w-full rounded-xl px-4 py-3 text-sm font-medium transition",
                !isConnected || pending
                  ? "cursor-not-allowed bg-white/10 text-white/40"
                  : "bg-white text-black hover:bg-white/90"
              )}
            >
              {pending ? "Working…" : "Create Escrow"}
            </button>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
              <div className="flex flex-col gap-2">
                <Row label="Connected" value={isConnected ? "Yes" : "No"} />
                <Row label="Wallet" value={address ? shortAddr(address) : "—"} />
                <Row
                  label="Last tx"
                  value={
                    lastTx ? (
                      <a className="underline underline-offset-4 hover:text-white" href={linkTx(lastTx) || "#"} target="_blank" rel="noreferrer">
                        {shortAddr(lastTx)}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <Row label="Receipt" value={receipt.isSuccess ? "Confirmed ✅" : receipt.isError ? "Failed ❌" : lastTx ? "Pending…" : "—"} />
              </div>

              {(statusMsg || errorMsg) && (
                <div className="mt-3 space-y-2">
                  {statusMsg && <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/80">{statusMsg}</div>}
                  {errorMsg && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-200">{errorMsg}</div>}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Manage */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
          <h2 className="text-lg font-medium">2) Manage escrow</h2>

          <div className="mt-4 grid gap-4">
            <Field
              label="Escrow ID (bytes32)"
              value={escrowId}
              onChange={(v: any) => {
                const raw =
                  typeof v === "string"
                    ? v
                    : (v?.target?.value ?? v?.currentTarget?.value ?? "");
                const t = String(raw || "").trim();
                const hex = t.startsWith("0x") ? t : (t.length ? "0x" + t : "");
                setEscrowId(hex);
              }}
              placeholder="0x… (66 chars)"
              hint="Auto-fills if decoded from tx logs; otherwise copy from BaseScan logs."
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                onClick={() => escrowRead.refetch()}
                disabled={!escrowIdLooksValid || escrowRead.isFetching}
                className={cx(
                  "rounded-xl px-4 py-3 text-sm font-medium transition",
                  !escrowIdLooksValid || escrowRead.isFetching
                    ? "cursor-not-allowed bg-white/10 text-white/40"
                    : "bg-white/10 text-white hover:bg-white/15"
                )}
              >
                {escrowRead.isFetching ? "Loading…" : "Load Escrow"}
              </button>

                
              <button
                onClick={handleRelease}
                disabled={!canRelease || pending}
                className={cx(
                  "rounded-xl px-4 py-3 text-sm font-medium transition",
                  !canRelease || pending
                    ? "cursor-not-allowed bg-white/10 text-white/40"
                    : "bg-white text-black hover:bg-white/90"
                )}
              >
                {isDisputed ? "Resolve Dispute · Release" : "Release"}
              </button>

              <button
                onClick={handleRefund}
                disabled={!canRefund || pending}
                className={cx(
                  "rounded-xl px-4 py-3 text-sm font-medium transition",
                  !canRefund || pending
                    ? "cursor-not-allowed bg-white/10 text-white/40"
                    : "bg-white text-black hover:bg-white/90"
                )}
              >
                {isDisputed ? "Resolve Dispute · Refund" : "Refund"}
              </button>

            </div>

            <button
              onClick={handleDispute}
              disabled={!canDispute || pending}
              className={cx(
                "rounded-xl px-4 py-3 text-sm font-medium transition",
                !canDispute || pending
                  ? "cursor-not-allowed bg-white/10 text-white/40"
                  : "bg-white/10 text-white hover:bg-white/15"
              )}
            >
              Open Dispute
            </button>

            
            {/* DEBUG – remove after fix */}
            <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-[11px] text-yellow-200">
              <pre>
{JSON.stringify({
  address,
  payer: escrow?.payer,
  payee: escrow?.payee,
  arbiter: escrow?.arbiter,
  status: escrow?.status?.toString?.(),
  escrowExists,
  isPayer,
  isPayee,
  isArbiter,
  canRelease,
  canRefund,
  canDispute,
  pending
}, null, 2)}


              </pre>
            </div>


            {/* Escrow State Panel */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Escrow state</div>
                <div className="text-xs text-white/60">{escrowRead.isFetching ? "Refreshing…" : "Live"}</div>
              </div>

              <div className="mt-3 space-y-2 text-xs text-white/75">
                {!escrowIdLooksValid && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    Enter a valid <span className="font-semibold">bytes32</span> escrow ID to load state.
                  </div>
                )}

                {escrowIdLooksValid && escrowRead.isError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-200">
                    {prettyError(escrowRead.error)}
                  </div>
                )}

                {escrowIdLooksValid && Boolean(escrowRead.data) && (
                  <div className="grid gap-2">
                    <Row label="Exists" value={escrowExists ? "Yes ✅" : "Unknown / empty"} />
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="mb-2 text-[11px] text-white/60">Raw struct</div>
                      <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-white/80">
                        {safeJsonPreview(escrow)}
                      </pre>
                    </div>
                  </div>
                )}

                {escrowIdLooksValid && !escrowRead.isFetching && !escrowRead.data && !escrowRead.isError && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    No data loaded yet. Click <span className="font-semibold">Load Escrow</span>.
                  </div>
                )}
              </div>
            </div>

            {/* Helpful links */}
            <div className="flex flex-wrap gap-3 text-xs text-white/70">
              <a className="underline underline-offset-4 hover:text-white" href={linkAddr(contractAddress) || "#"} target="_blank" rel="noreferrer">
                Contract
              </a>
              {lastTx && (
                <a className="underline underline-offset-4 hover:text-white" href={linkTx(lastTx) || "#"} target="_blank" rel="noreferrer">
                  Last Tx
                </a>
              )}
              {escrowIdLooksValid && (
                <a
                  className="underline underline-offset-4 hover:text-white"
                  href={`${explorerBase()}/search?f=0&q=${escrowIdHex}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Search escrowId
                </a>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-10 text-xs text-white/50">
        Tip: Keep one tab on <span className="text-white/70">/demo</span> and one tab on <span className="text-white/70">BaseScan</span>.
      </div>
    </div>
  );
}