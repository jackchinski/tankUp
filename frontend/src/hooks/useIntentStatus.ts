import { useState, useEffect, useRef } from "react";
import { GetStatusResponse, DepositIntent, ChainDispersalStatus } from "../types";
import { fetchIntentStatus } from "../utils/api";

interface UseIntentStatusOptions {
  intentId?: string;
  enabled?: boolean;
  pollInterval?: number; // in milliseconds
}

interface UseIntentStatusReturn {
  data: GetStatusResponse | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch and poll intent status from the backend API.
 * Set enabled to false to use mock data instead.
 */
export function useIntentStatus({
  intentId,
  enabled = true,
  pollInterval = 3000,
}: UseIntentStatusOptions): UseIntentStatusReturn {
  const [data, setData] = useState<GetStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!intentId || !enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchIntentStatus(intentId);
        setData(response);
        // Stop polling only when everything is terminal:
        // - global COMPLETED/DISPERSED, or
        // - all chainStatuses are terminal (CONFIRMED or FAILED)
        const chainStatuses = response.intent?.chainStatuses ?? [];
        const hasChains = chainStatuses.length > 0;
        const allChainsTerminal = hasChains
          ? chainStatuses.every((c) => c.status === "CONFIRMED" || c.status === "FAILED")
          : false;

        const terminal =
          response.intent?.globalPhase === "COMPLETED" ||
          response.intent?.status === "DISPERSED" ||
          allChainsTerminal;
        if (terminal && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling
    intervalRef.current = setInterval(fetchStatus, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intentId, enabled, pollInterval]);

  return { data, isLoading, error };
}

