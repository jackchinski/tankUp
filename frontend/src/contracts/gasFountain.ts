// Gas Fountain Contract ABI
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
] as const;

// Contract address on Base
export const GAS_FOUNDATION_CONTRACT_ADDRESS =
  "0x54995d0d3b82Cb374666D9FFC242e2812e5b1f6D" as const;

// USDC has 6 decimals on Base
export const USDC_DECIMALS = 6;
