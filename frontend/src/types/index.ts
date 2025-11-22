import { Chain } from "viem";

export interface ChainData {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  avgTxCost: number;
  nativePrice: number;
  viemChain: Chain;
}

export interface Token {
  symbol: string;
  name: string;
  balance: number;
  logo: string;
  isNative: boolean;
  address?: string | null;
  isLoading?: boolean;
}

export interface GasFountainContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  selectedChains: ChainData[];
  setSelectedChains: (chains: ChainData[]) => void;
  transactionCounts: Record<string, number>;
  setTransactionCounts: (
    counts:
      | Record<string, number>
      | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
  sourceChain: ChainData | null;
  setSourceChain: (chain: ChainData) => Promise<void>;
  sourceToken: Token | null;
  setSourceToken: (token: Token | null) => void;
  depositAmount: number;
  setDepositAmount: (amount: number) => void;
  history: HistoryItem[];
  setHistory: (
    history: HistoryItem[] | ((prev: HistoryItem[]) => HistoryItem[])
  ) => void;
  isConnected: boolean;
  address: `0x${string}` | undefined;
  chainId: number | undefined;
  tokenBalances: Token[];
  balancesLoading: boolean;
  depositTxHash: string | undefined;
  setDepositTxHash: (txHash: string | undefined) => void;
}

export interface HistoryItem {
  id: number;
  timestamp: number;
  amount: number;
  chains: number;
  status: "Success" | "Failed" | "Pending";
}

export interface GasFountainProviderProps {
  children: React.ReactNode;
}

// Backend API types
export type ChainDispersalStatus =
  | "NOT_STARTED"
  | "QUEUED"
  | "BROADCASTED"
  | "CONFIRMED"
  | "FAILED";

export type IntentStatus =
  | "DEPOSIT_CONFIRMED"
  | "DISPERSE_QUEUED"
  | "DISPERSE_IN_PROGRESS"
  | "DISPERSED"
  | "FAILED";

export type GlobalPhase =
  | "DEPOSIT_CONFIRMED"
  | "PREPARING_SWAP"
  | "SWAPPING"
  | "DISPERSING"
  | "COMPLETED"
  | "FAILED";

export interface ChainDispersal {
  chainId: number;
  chainName?: string;
  nativeSymbol?: string;
  amountUsd: string;
  estNativeAmount?: string;
  status: ChainDispersalStatus;
  txHash?: string;
  explorerUrl?: string;
  gasUsed?: string;
  errorMessage?: string;
  updatedAt: string;
}

export interface DepositIntent {
  id: string;
  userAddress: string;
  sourceChainId: number;
  sourceTxHash: string;
  sourceBlockNumber?: number;
  tokenAddress: string;
  tokenSymbol?: string;
  amountInTokenRaw: string;
  amountInUsd: string;
  status: IntentStatus;
  globalPhase: GlobalPhase;
  allocations: Array<{
    chainId: number;
    chainName?: string;
    nativeSymbol?: string;
    amountUsd: string;
    estNativeAmount?: string;
  }>;
  chainStatuses: ChainDispersal[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GetStatusResponse {
  intent: DepositIntent;
}

export interface HistoryEntry {
  id: string;
  userAddress: string;
  sourceChainId: number;
  sourceTxHash: string;
  tokenSymbol?: string;
  amountInUsd: string;
  status: IntentStatus;
  createdAt: string;
  completedAt?: string;
  numChains: number;
  chains: {
    chainId: number;
    chainName?: string;
    amountUsd: string;
    status: ChainDispersalStatus;
  }[];
}

export interface GetHistoryResponse {
  items: HistoryEntry[];
  nextCursor?: string;
}
