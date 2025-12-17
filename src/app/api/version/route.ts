export async function GET() {
  return Response.json({
    name: "BulwarkX Base App",
    chain: process.env.NEXT_PUBLIC_CHAIN || "unknown",
    basescans: process.env.NEXT_PUBLIC_BASESCAN_BASE || "unknown",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    time: new Date().toISOString(),
  });
}
