import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { chains } from "../data/chains";
import { useAccount, useSwitchChain } from "wagmi";
import { useTokenBalances } from "../hooks/useTokenBalances";
import { getViemChain } from "../data/chains";
import {
  GasFountainContextType,
  GasFountainProviderProps,
  ChainData,
  HistoryItem,
} from "../types";

const GasFountainContext = createContext<GasFountainContextType | undefined>(
  undefined
);

export const useGasFountain = (): GasFountainContextType => {
  const context = useContext(GasFountainContext);
  if (!context) {
    throw new Error("useGasFountain must be used within a GasFountainProvider");
  }
  return context;
};

export const GasFountainProvider: React.FC<GasFountainProviderProps> = ({
  children,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedChains, setSelectedChains] = useState<ChainData[]>([]);
  const [transactionCounts, setTransactionCounts] = useState<
    Record<string, number>
  >({});
  const [sourceChain, setSourceChainState] = useState<ChainData | null>(null);
  const [sourceToken, setSourceToken] = useState<
    import("../types").Token | null
  >(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: 1,
      timestamp: Date.now() - 1000000,
      amount: 15,
      chains: 3,
      status: "Success",
    },
    {
      id: 2,
      timestamp: Date.now() - 5000000,
      amount: 50,
      chains: 5,
      status: "Success",
    },
  ]);

  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const sourceChainId = sourceChain?.id || "eth";
  const { balances: tokenBalances, isLoading: balancesLoading } =
    useTokenBalances(sourceChainId);

  // Initialize with all chains selected and default 10 txs
  useEffect(() => {
    if (selectedChains.length === 0) {
      setSelectedChains(chains);
      const initialCounts: Record<string, number> = {};
      chains.forEach((c) => (initialCounts[c.id] = 10));
      setTransactionCounts(initialCounts);
    }
  }, [selectedChains.length]);

  // Initialize source chain
  useEffect(() => {
    if (!sourceChain && chains.length > 0) {
      setSourceChainState(chains[0]);
    }
  }, [sourceChain]);

  // Handle chain switching
  const handleSwitchChain = useCallback(
    async (chain: ChainData): Promise<void> => {
      if (!isConnected || !address) {
        // If not connected, just set the chain (will prompt on connect)
        setSourceChainState(chain);
        return;
      }

      const viemChain = getViemChain(chain.id);
      if (!viemChain) return;

      // If already on the correct chain, just update state
      if (chainId === viemChain.id) {
        setSourceChainState(chain);
        return;
      }

      // Switch to the new chain
      try {
        await switchChain({ chainId: viemChain.id });
        setSourceChainState(chain);
      } catch (error) {
        console.error("Failed to switch chain:", error);
      }
    },
    [isConnected, address, chainId, switchChain]
  );

  // Update token balances when chain or connection changes
  useEffect(() => {
    if (isConnected && tokenBalances.length > 0) {
      // Update token balances in context
      // This will be used by components to display real balances
    }
  }, [isConnected, tokenBalances, sourceChainId]);

  const value: GasFountainContextType = {
    currentStep,
    setCurrentStep,
    selectedChains,
    setSelectedChains,
    transactionCounts,
    setTransactionCounts,
    sourceChain,
    setSourceChain: handleSwitchChain,
    sourceToken,
    setSourceToken,
    depositAmount,
    setDepositAmount,
    history,
    setHistory,
    // Wallet state
    isConnected,
    address,
    chainId,
    // Token balances
    tokenBalances,
    balancesLoading,
  };

  return (
    <GasFountainContext.Provider value={value}>
      {children}
    </GasFountainContext.Provider>
  );
};
