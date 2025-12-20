"use client";

import React from "react";

export function ClientErrorTrap({ children }: { children: React.ReactNode }) {
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setErr(String(event.error?.stack || event.message || event.error));
      // keep console for Vercel logs
      console.error("[ClientErrorTrap] window.error:", event.error || event.message);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      setErr(String(event.reason?.stack || event.reason));
      console.error("[ClientErrorTrap] unhandledrejection:", event.reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (err) {
    return (
      <div className="min-h-[200px] rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        <div className="font-semibold">Client Error (Captured)</div>
        <pre className="mt-2 whitespace-pre-wrap break-words opacity-90">{err}</pre>
      </div>
    );
  }

  return <>{children}</>;
}
