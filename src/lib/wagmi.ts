import { http } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import { createConfig } from "wagmi";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  rainbowWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const selectedChain =
  process.env.NEXT_PUBLIC_CHAIN === "base" ? base : baseSepolia;

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet, coinbaseWallet, rainbowWallet, walletConnectWallet],
    },
  ],
  { appName: "BulwarkX", projectId: wcProjectId }
);

export const wagmiConfig = createConfig({
  chains: [selectedChain],
  connectors,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});
