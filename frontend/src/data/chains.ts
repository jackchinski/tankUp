import {
  mainnet,
  arbitrum,
  base,
  optimism,
  polygon,
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
  poly: polygon,
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
    id: "poly",
    name: "Polygon",
    symbol: "MATIC",
    logo: "https://cryptologos.cc/logos/polygon-matic-logo.svg?v=026",
    avgTxCost: 0.02,
    nativePrice: 0.8,
    viemChain: polygon,
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
];

// For demo: Only Base as source, Base/Arbitrum/Optimism/Polygon as destinations
export const SOURCE_CHAINS = allChains.filter((chain) => chain.id === "base");
export const DESTINATION_CHAINS = allChains.filter((chain) =>
  ["base", "arb", "op", "poly"].includes(chain.id)
);

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

export { chainIdMap };
