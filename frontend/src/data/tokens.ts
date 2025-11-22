import { Token } from "../types";

// Token contract addresses by chain
// Using common ERC20 token addresses
const TOKEN_ADDRESSES: Record<string, Record<string, string | null>> = {
  // Ethereum Mainnet
  eth: {
    ETH: null, // Native token
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  // Base
  base: {
    ETH: null,
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    WETH: "0x4200000000000000000000000000000000000006",
  },
  // Arbitrum
  arb: {
    ETH: null,
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  },
  // Optimism
  op: {
    ETH: null,
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62611d6Cb4b9A",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    WETH: "0x4200000000000000000000000000000000000006",
  },
  // Polygon
  poly: {
    MATIC: null,
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  },
  // BNB Chain
  bsc: {
    BNB: null,
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    WETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
  },
  // Avalanche
  avax: {
    AVAX: null,
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    WETH: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
  },
  // Scroll
  scroll: {
    ETH: null,
    USDC: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
    USDT: "0xf55BEC9cafDbE8730f096AaC297B3c2C5C2b5EBC",
    WETH: "0x5300000000000000000000000000000000000004",
  },
  // Zora
  zora: {
    ETH: null,
    USDC: "0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2",
    USDT: "0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2", // May not exist
    WETH: "0x4200000000000000000000000000000000000006",
  },
};

export const tokens: Token[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    balance: 0, // Will be fetched from wallet
    logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1696501628",
    isNative: true,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    balance: 0,
    logo: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1696501734",
    isNative: false,
  },
  {
    symbol: "USDT",
    name: "Tether",
    balance: 0,
    logo: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1696501661",
    isNative: false,
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    balance: 0,
    logo: "https://assets.coingecko.com/coins/images/2518/small/weth.png?1696503332",
    isNative: false,
  },
];

// Helper to get token address for a chain
export const getTokenAddress = (
  chainId: string,
  tokenSymbol: string
): string | null => {
  return TOKEN_ADDRESSES[chainId]?.[tokenSymbol] || null;
};

// Helper to get all tokens for a chain
export const getTokensForChain = (chainId: string): Token[] => {
  const chainTokens = TOKEN_ADDRESSES[chainId] || {};
  return tokens.map((token) => ({
    ...token,
    address: chainTokens[token.symbol] || null,
  }));
};
