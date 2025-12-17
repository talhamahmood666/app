import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { base, baseSepolia } from "wagmi/chains";

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const selectedChain =
  process.env.NEXT_PUBLIC_CHAIN === "base" ? base : baseSepolia;

export const wagmiConfig = getDefaultConfig({
  appName: "BulwarkX",
  projectId: wcProjectId,
  chains: [selectedChain],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});
