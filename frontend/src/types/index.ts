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
