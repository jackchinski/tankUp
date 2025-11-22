import { useState, useEffect, useRef } from "react";
import { GetStatusResponse, DepositIntent, ChainDispersalStatus } from "../types";
import { chains, getNumericChainId } from "../data/chains";
import { ChainData } from "../types";

interface UseMockIntentStatusOptions {
  intentId?: string;
  selectedChains: ChainData[];
  transactionCounts: Record<string, number>;
  enabled?: boolean;
  pollInterval?: number; // in milliseconds
}

interface UseMockIntentStatusReturn {
  data: GetStatusResponse | null;
  isLoading: boolean;
  error: Error | null;
}

// Status progression order
const STATUS_PROGRESSION: ChainDispersalStatus[] = [
  "NOT_STARTED",
  "QUEUED",
  "BROADCASTED",
  "CONFIRMED",
];

/**
 * Mock hook that simulates intent status progression over time.
 * Chains will progress through statuses: NOT_STARTED -> QUEUED -> BROADCASTED -> CONFIRMED
 * Each chain progresses at a slightly different rate to simulate real-world behavior.
 */
export function useMockIntentStatus({
  intentId,
  selectedChains,
  transactionCounts,
  enabled = true,
  pollInterval = 3000,
}: UseMockIntentStatusOptions): UseMockIntentStatusReturn {
  const [data, setData] = useState<GetStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const statusProgressRef = useRef<Map<number, number>>(new Map()); // chainId -> status index
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!intentId || !enabled || selectedChains.length === 0) {
      setData(null);
      setIsLoading(false);
      setError(null);
      statusProgressRef.current.clear();
      return;
    }

    // Initialize status progress for each chain
    selectedChains.forEach((chain) => {
      const numericChainId = getNumericChainId(chain.id);
      if (numericChainId && !statusProgressRef.current.has(numericChainId)) {
        // Start each chain at a slightly different time (0-2 seconds offset)
        statusProgressRef.current.set(numericChainId, 0);
      }
    });

    const updateStatus = () => {
      setIsLoading(true);
      
      // Calculate elapsed time since start
      const elapsed = Date.now() - startTimeRef.current;
      
      // Create chain statuses with progressive status updates
      const chainStatuses = selectedChains.map((chain, index) => {
        const numericChainId = getNumericChainId(chain.id);
        if (!numericChainId) return null;

        const currentProgress = statusProgressRef.current.get(numericChainId) || 0;
        
        // Each chain progresses at different rates
        // Chain 0: fastest (every 2 seconds)
        // Chain 1: medium (every 3 seconds)
        // Chain 2+: slower (every 4+ seconds)
        const progressInterval = 2000 + (index % 3) * 1000;
        const progressStep = Math.floor(elapsed / progressInterval);
        
        // Add some randomness - each chain starts at slightly different times
        const chainStartOffset = index * 500; // 500ms offset per chain
        const adjustedElapsed = Math.max(0, elapsed - chainStartOffset);
        const adjustedProgressStep = Math.floor(adjustedElapsed / progressInterval);
        
        // Determine current status based on progress
        let statusIndex = Math.min(
          adjustedProgressStep,
          STATUS_PROGRESSION.length - 1
        );
        
        // Update the progress ref
        statusProgressRef.current.set(numericChainId, statusIndex);
        
        const status = STATUS_PROGRESSION[statusIndex];
        const amountUsd = (
          (transactionCounts[chain.id] || 10) * chain.avgTxCost
        ).toFixed(2);

        return {
          chainId: numericChainId,
          chainName: chain.name,
          nativeSymbol: chain.symbol,
          amountUsd,
          status,
          txHash:
            status === "CONFIRMED" || status === "BROADCASTED"
              ? `0x${Math.random().toString(16).substring(2, 66)}`
              : undefined,
          explorerUrl:
            status === "CONFIRMED" || status === "BROADCASTED"
              ? `https://etherscan.io/tx/0x${Math.random().toString(16).substring(2, 66)}`
              : undefined,
          updatedAt: new Date().toISOString(),
        };
      }).filter((item): item is NonNullable<typeof item> => item !== null);

      // Create mock intent response
      const mockIntent: DepositIntent = {
        id: intentId,
        userAddress: "0x0000000000000000000000000000000000000000",
        sourceChainId: selectedChains[0] ? getNumericChainId(selectedChains[0].id) || 1 : 1,
        sourceTxHash: intentId,
        tokenAddress: "0x0000000000000000000000000000000000000000",
        tokenSymbol: "USDC",
        amountInTokenRaw: "100000000",
        amountInUsd: chainStatuses
          .reduce((sum, cs) => sum + parseFloat(cs.amountUsd), 0)
          .toFixed(2),
        status:
          chainStatuses.every((cs) => cs.status === "CONFIRMED")
            ? "DISPERSED"
            : chainStatuses.some((cs) => cs.status === "BROADCASTED" || cs.status === "CONFIRMED")
            ? "DISPERSE_IN_PROGRESS"
            : chainStatuses.some((cs) => cs.status === "QUEUED")
            ? "DISPERSE_QUEUED"
            : "DEPOSIT_CONFIRMED",
        globalPhase:
          chainStatuses.every((cs) => cs.status === "CONFIRMED")
            ? "COMPLETED"
            : chainStatuses.some((cs) => cs.status === "BROADCASTED" || cs.status === "CONFIRMED")
            ? "DISPERSING"
            : chainStatuses.some((cs) => cs.status === "QUEUED")
            ? "PREPARING_SWAP"
            : "DEPOSIT_CONFIRMED",
        allocations: chainStatuses.map((cs) => ({
          chainId: cs.chainId,
          chainName: cs.chainName,
          nativeSymbol: cs.nativeSymbol,
          amountUsd: cs.amountUsd,
        })),
        chainStatuses,
        createdAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        updatedAt: new Date().toISOString(),
        completedAt:
          chainStatuses.every((cs) => cs.status === "CONFIRMED")
            ? new Date().toISOString()
            : undefined,
      };

      setData({ intent: mockIntent });
      setIsLoading(false);
    };

    // Initial update
    updateStatus();

    // Set up polling
    const interval = setInterval(updateStatus, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [intentId, enabled, selectedChains, transactionCounts, pollInterval]);

  return { data, isLoading, error };
}

