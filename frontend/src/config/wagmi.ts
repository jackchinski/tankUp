import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { chains } from "../data/chains";
import { Chain } from "viem";

// Get all viem chains from our chain data
const allChains = (chains || [])
  .map((c) => c.viemChain)
  .filter((chain): chain is Chain => Boolean(chain));

// Ensure we have at least one chain (required by WagmiAdapter)
export const supportedChains: [Chain, ...Chain[]] =
  allChains.length > 0
    ? (allChains as [Chain, ...Chain[]])
    : ([chains[0]?.viemChain].filter((chain): chain is Chain =>
        Boolean(chain)
      ) as [Chain, ...Chain[]]);

const projectId: string =
  import.meta.env.VITE_REOWN_PROJECT_ID || "ea104276d5af626ff7bdfc3ed190e8f8";

if (!projectId || projectId === "YOUR_PROJECT_ID") {
  console.warn(
    "⚠️ VITE_REOWN_PROJECT_ID is not set. Please add it to your .env file."
  );
}
// Convert chains to networks format for AppKit
type AppKitNetwork = {
  id: number;
  name: string;
  nativeCurrency: Chain["nativeCurrency"];
  rpcUrls: {
    default: {
      http: string[];
    };
  };
  blockExplorers?: Chain["blockExplorers"];
};

const networksArray: AppKitNetwork[] = supportedChains.map((chain) => ({
  id: chain.id,
  name: chain.name,
  nativeCurrency: chain.nativeCurrency,
  rpcUrls: {
    default: {
      http: [...chain.rpcUrls.default.http],
    },
  },
  blockExplorers: chain.blockExplorers,
}));

// Ensure networks is a non-empty tuple
const networks: [AppKitNetwork, ...AppKitNetwork[]] =
  networksArray.length > 0
    ? ([networksArray[0], ...networksArray.slice(1)] as [
        AppKitNetwork,
        ...AppKitNetwork[]
      ])
    : ([
        {
          id: 1,
          name: "Ethereum",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: ["https://eth.llamarpc.com"] } },
        },
      ] as [AppKitNetwork, ...AppKitNetwork[]]);

// Ensure we have valid chains and networks before creating adapter
if (supportedChains.length === 0) {
  throw new Error("No supported chains configured");
}

if (networks.length === 0) {
  throw new Error("No networks configured");
}

// Create WagmiAdapter with explicit config
const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  projectId,
  chains: supportedChains,
  networks,
});

// Create AppKit config (to be used with AppKitProvider)
export const appKitConfig = {
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata: {
    name: "Gas Fountain",
    description: "One deposit. Gas everywhere.",
    url: typeof window !== "undefined" ? window.location.origin : "",
    icons:
      typeof window !== "undefined"
        ? [`${window.location.origin}/vite.svg`]
        : [],
  },
  features: {
    analytics: true,
    email: false,
    socials: false as const,
  },
  themeMode: "dark" as const,
  themeVariables: {
    "--w3m-accent": "#2997ff",
    "--w3m-background-color": "#000000",
    "--w3m-container-border-radius": "16px",
  } as Record<string, string>,
};

// Create AppKit instance for programmatic access
export const appKit = createAppKit(appKitConfig);
