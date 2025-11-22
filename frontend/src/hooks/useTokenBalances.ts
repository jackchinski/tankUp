import { useAccount, useBalance, useReadContracts } from "wagmi";
import { formatUnits, Address } from "viem";
import { getTokenAddress, tokens } from "../data/tokens";
import { getViemChain } from "../data/chains";
import { useMemo } from "react";
import { Token } from "../types";

// ERC20 ABI for balanceOf and decimals
const ERC20_ABI = [
  {
    stateMutability: "view",
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "_owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

interface UseTokenBalancesReturn {
  balances: Token[];
  isLoading: boolean;
}

export const useTokenBalances = (chainId: string): UseTokenBalancesReturn => {
  const { address, isConnected } = useAccount();
  const viemChain = getViemChain(chainId);

  // Get native token balance
  const { data: nativeBalance, isLoading: nativeLoading } = useBalance({
    address,
    chainId: viemChain?.id,
    query: {
      enabled: isConnected && !!address && !!viemChain,
    },
  });

  // Prepare contract calls for ERC20 tokens
  const contracts = useMemo(() => {
    if (!address || !viemChain) return [];

    return tokens
      .filter((token) => {
        const tokenAddress = getTokenAddress(chainId, token.symbol);
        return !token.isNative && tokenAddress;
      })
      .flatMap((token) => {
        const tokenAddress = getTokenAddress(chainId, token.symbol);
        if (!tokenAddress) return [];

        return [
          {
            address: tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: "balanceOf" as const,
            args: [address],
            chainId: viemChain.id,
          },
          {
            address: tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: "decimals" as const,
            chainId: viemChain.id,
          },
        ];
      });
  }, [address, chainId, viemChain]);

  // Fetch all ERC20 balances and decimals in parallel
  const { data: contractData, isLoading: contractsLoading } = useReadContracts({
    contracts,
    query: {
      enabled: isConnected && !!address && !!viemChain && contracts.length > 0,
    },
  });

  // Process the results
  const tokenBalances = useMemo(() => {
    return tokens.map((token, index): Token => {
      const tokenAddress = getTokenAddress(chainId, token.symbol);
      const isNative = token.isNative || !tokenAddress;

      if (isNative) {
        return {
          ...token,
          balance: nativeBalance
            ? parseFloat(
                formatUnits(nativeBalance.value, nativeBalance.decimals)
              )
            : 0,
          address: null,
          isLoading: nativeLoading,
        };
      }

      // For ERC20 tokens, find the corresponding contract results
      // Each token has 2 contracts (balanceOf and decimals)
      const contractIndex =
        tokens.slice(0, index).filter((t) => {
          const addr = getTokenAddress(chainId, t.symbol);
          return !t.isNative && addr;
        }).length * 2;

      const balanceResult = contractData?.[contractIndex];
      const decimalsResult = contractData?.[contractIndex + 1];

      const balance =
        balanceResult?.result && decimalsResult?.result
          ? parseFloat(
              formatUnits(
                balanceResult.result as bigint,
                decimalsResult.result as number
              )
            )
          : 0;

      return {
        ...token,
        balance,
        address: tokenAddress,
        isLoading: contractsLoading,
      };
    });
  }, [chainId, nativeBalance, nativeLoading, contractData, contractsLoading]);

  return {
    balances: tokenBalances,
    isLoading: nativeLoading || contractsLoading,
  };
};
