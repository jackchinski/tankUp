import { useState, useEffect, useCallback } from "react";
import { fetchHistory, FetchHistoryOptions } from "../utils/api";
import { HistoryEntry } from "../types";

interface UseRecentActivityOptions {
  address?: string;
  status?: FetchHistoryOptions["status"];
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number; // in milliseconds, 0 to disable
}

interface UseRecentActivityReturn {
  data: HistoryEntry[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  nextCursor: string | undefined;
}

/**
 * Hook to fetch and optionally poll recent activity/history for a wallet address.
 *
 * @param options - Configuration options
 * @param options.address - Wallet address to fetch history for
 * @param options.status - Optional status filter
 * @param options.limit - Number of results to fetch (default: 20, max: 100)
 * @param options.enabled - Whether to fetch (default: true)
 * @param options.refetchInterval - Polling interval in ms (default: 0, disabled)
 *
 * @returns History data, loading state, error, and refetch function
 */
export function useRecentActivity({
  address,
  status,
  limit = 20,
  enabled = true,
  refetchInterval = 0,
}: UseRecentActivityOptions = {}): UseRecentActivityReturn {
  const [data, setData] = useState<HistoryEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const fetchData = useCallback(async () => {
    if (!enabled || !address) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchHistory({
        userAddress: address,
        status,
        limit,
      });

      setData(response.items);
      setNextCursor(response.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, status, limit, enabled]);

  useEffect(() => {
    fetchData();

    // Set up polling if refetchInterval is provided
    if (refetchInterval > 0 && enabled && address) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval, enabled, address]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    hasMore: !!nextCursor,
    nextCursor,
  };
}
