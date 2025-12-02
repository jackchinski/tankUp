/**
 * Chain configuration with RPC URLs and contract addresses
 * TODO: Move RPC URLs to environment variables for production
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress?: string; // Escrow contract address on this chain
  explorerUrl: string;
  nativeSymbol: string;
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    name: "Ethereum",
    rpcUrl: process.env.ETH_RPC_URL || "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    nativeSymbol: "ETH",
  },
  // Optimism
  10: {
    chainId: 10,
    name: "Optimism",
    rpcUrl: process.env.OP_RPC_URL || "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    nativeSymbol: "ETH",
    contractAddress:
      process.env.CONTRACT_ADDRESS_10 ||
      "0x839eaf1fe9fc3d46309893f5ec4c2c289783f991",
  },
  // Arbitrum
  42161: {
    chainId: 42161,
    name: "Arbitrum",
    rpcUrl: process.env.ARB_RPC_URL || "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    nativeSymbol: "ETH",
    contractAddress:
      process.env.CONTRACT_ADDRESS_42161 ||
      "0x839eaf1fe9fc3d46309893f5ec4c2c289783f991",
  },
  // Base
  8453: {
    chainId: 8453,
    name: "Base",
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    nativeSymbol: "ETH",
    contractAddress:
      process.env.CONTRACT_ADDRESS_8453 ||
      "0x839eaf1fe9fc3d46309893f5ec4c2c289783f991",
  },
  // BSC
  56: {
    chainId: 56,
    name: "BNB Chain",
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    nativeSymbol: "BNB",
  },
  // Avalanche
  43114: {
    chainId: 43114,
    name: "Avalanche",
    rpcUrl: process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://snowtrace.io",
    nativeSymbol: "AVAX",
  },
  // Scroll
  534352: {
    chainId: 534352,
    name: "Scroll",
    rpcUrl: process.env.SCROLL_RPC_URL || "https://rpc.scroll.io",
    explorerUrl: "https://scrollscan.com",
    nativeSymbol: "ETH",
  },
  // Zora
  7777777: {
    chainId: 7777777,
    name: "Zora",
    rpcUrl: process.env.ZORA_RPC_URL || "https://rpc.zora.energy",
    explorerUrl: "https://explorer.zora.energy",
    nativeSymbol: "ETH",
  },
  // World Chain
  480: {
    chainId: 480,
    name: "World Chain",
    rpcUrl:
      process.env.WORLD_RPC_URL ||
      "https://worldchain-mainnet.g.alchemy.com/v2/demo",
    explorerUrl: "https://worldscan.org",
    nativeSymbol: "ETH",
    contractAddress:
      process.env.CONTRACT_ADDRESS_480 ||
      "0xa919f82f753c6e63ae1644f8d225c781e5287676",
  },
};

/**
 * Get chain configuration by chain ID
 */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

/**
 * Get contract address for a chain
 * TODO: Load from environment variables or a registry
 */
export function getContractAddress(chainId: number): string | undefined {
  const config = getChainConfig(chainId);
  return config?.contractAddress || process.env[`CONTRACT_ADDRESS_${chainId}`];
}
