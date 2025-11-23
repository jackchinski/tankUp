// Gas Station Contract ABI
export const GAS_FOUNDATION_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "totalAmount",
        type: "uint256",
      },
      {
        internalType: "uint256[]",
        name: "chainIds",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "chainAmounts",
        type: "uint256[]",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "usdcAmount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
    ],
    name: "drip",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "poolFee",
    outputs: [
      {
        internalType: "uint24",
        name: "",
        type: "uint24",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "swapRouter",
    outputs: [
      {
        internalType: "contract ISwapRouter",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "usdc",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "weth",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "chainIds",
        type: "uint256[]",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "chainAmounts",
        type: "uint256[]",
      },
    ],
    name: "Deposited",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "usdcAmountIn",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "nativeAmountOut",
        type: "uint256",
      },
    ],
    name: "Dripped",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
] as const;

// Contract addresses by chain
export const GAS_FOUNDATION_CONTRACT_ADDRESSES: Record<string, `0x${string}`> = {
  base: "0x771DffdD30Cae323afF4b72a356C023c963A8236" as `0x${string}`,
  arb: "0xe4dccc71893b66232892f1770ebe6ac75dba80b9" as `0x${string}`,
  op: "0xfef4cc60c634c0f911a11abb120503bfabf2df66" as `0x${string}`,
  world: "0xa919f82f753c6e63ae1644f8d225c781e5287676" as `0x${string}`,
} as const;

// Legacy: Default to Base for backward compatibility
export const GAS_FOUNDATION_CONTRACT_ADDRESS = GAS_FOUNDATION_CONTRACT_ADDRESSES.base;

// Helper to get contract address for a chain
export const getContractAddress = (chainId: string): `0x${string}` | undefined => {
  return GAS_FOUNDATION_CONTRACT_ADDRESSES[chainId];
};

// USDC has 6 decimals on Base and Arbitrum
export const USDC_DECIMALS = 6;
