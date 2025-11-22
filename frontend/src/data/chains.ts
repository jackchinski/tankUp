import {
  mainnet,
  arbitrum,
  base,
  optimism,
  bsc,
  avalanche,
  scroll,
  zora,
  Chain,
} from "viem/chains";
import { ChainData } from "../types";

// Map chain IDs to viem chain objects
const chainIdMap: Record<string, Chain> = {
  eth: mainnet,
  arb: arbitrum,
  base: base,
  op: optimism,
  bsc: bsc,
  avax: avalanche,
  scroll: scroll,
  zora: zora,
};

// All available chains (for reference)
const allChains: ChainData[] = [
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=026",
    avgTxCost: 2.5,
    nativePrice: 3000,
    viemChain: mainnet,
  },
  {
    id: "base",
    name: "Base",
    symbol: "ETH",
    logo: "https://avatars.githubusercontent.com/u/108554348?s=200&v=4",
    avgTxCost: 0.05,
    nativePrice: 3000,
    viemChain: base,
  },
  {
    id: "arb",
    name: "Arbitrum",
    symbol: "ETH",
    logo: "https://cryptologos.cc/logos/arbitrum-arb-logo.svg?v=026",
    avgTxCost: 0.1,
    nativePrice: 3000,
    viemChain: arbitrum,
  },
  {
    id: "op",
    name: "Optimism",
    symbol: "OP",
    logo: "https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg?v=026",
    avgTxCost: 0.08,
    nativePrice: 3.5,
    viemChain: optimism,
  },
  {
    id: "bsc",
    name: "BNB Chain",
    symbol: "BNB",
    logo: "https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=026",
    avgTxCost: 0.15,
    nativePrice: 600,
    viemChain: bsc,
  },
  {
    id: "avax",
    name: "Avalanche",
    symbol: "AVAX",
    logo: "https://cryptologos.cc/logos/avalanche-avax-logo.svg?v=026",
    avgTxCost: 0.25,
    nativePrice: 35,
    viemChain: avalanche,
  },
  {
    id: "scroll",
    name: "Scroll",
    symbol: "ETH",
    logo: "https://scroll.io/static/media/logo_scroll_black.35d64795.svg",
    avgTxCost: 0.12,
    nativePrice: 3000,
    viemChain: scroll,
  },
  {
    id: "zora",
    name: "Zora",
    symbol: "ETH",
    logo: "https://zora.co/favicon.ico",
    avgTxCost: 0.06,
    nativePrice: 3000,
    viemChain: zora,
  },
  {
    id: "world",
    name: "World",
    symbol: "WLD",
    logo: "https://cryptologos.cc/logos/worldcoin-wld-logo.svg?v=026",
    avgTxCost: 0.05,
    nativePrice: 5.0,
    viemChain: base, // TODO: Replace with actual World chain when available
  },
];

// Source and destination chains: OP, World, Base, Arbitrum (in this order)
const supportedChainIds = ["op", "world", "base", "arb"] as const;
export const SOURCE_CHAINS = supportedChainIds
  .map((id) => allChains.find((chain) => chain.id === id))
  .filter((chain): chain is ChainData => chain !== undefined);
export const DESTINATION_CHAINS = supportedChainIds
  .map((id) => allChains.find((chain) => chain.id === id))
  .filter((chain): chain is ChainData => chain !== undefined);

// Export all chains for backward compatibility
export const chains = allChains;

export const getViemChain = (chainId: string): Chain | undefined => {
  return chainIdMap[chainId];
};

// Map numeric chain IDs to string chain IDs
export const getChainIdFromNumeric = (
  numericChainId: number
): string | undefined => {
  const chain = chains.find((c) => c.viemChain.id === numericChainId);
  return chain?.id;
};

// Map string chain IDs to numeric chain IDs
export const getNumericChainId = (chainId: string): number | undefined => {
  const chain = chains.find((c) => c.id === chainId);
  return chain?.viemChain.id;
};

// Get explorer URL for a chain
export const getExplorerUrl = (chainId: string): string => {
  const chain = chains.find((c) => c.id === chainId);
  if (!chain) return "https://basescan.org";

  // Use blockExplorer from viem chain if available
  const explorer = chain.viemChain.blockExplorers?.default;
  if (explorer?.url) {
    return explorer.url;
  }

  // Fallback to known explorers
  const explorerMap: Record<string, string> = {
    base: "https://basescan.org",
    arb: "https://arbiscan.io",
    op: "https://optimistic.etherscan.io",
    eth: "https://etherscan.io",
  };

  return explorerMap[chainId] || "https://basescan.org";
};

export { chainIdMap };
