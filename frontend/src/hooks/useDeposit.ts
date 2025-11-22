import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import {
  GAS_FOUNDATION_ABI,
  GAS_FOUNDATION_CONTRACT_ADDRESS,
  USDC_DECIMALS,
} from "../contracts/gasFountain";
import { ERC20_ABI } from "../contracts/erc20";
import { getNumericChainId } from "../data/chains";
import { getTokenAddress } from "../data/tokens";
import { ChainData } from "../types";
import { useAccount } from "wagmi";

interface UseDepositOptions {
  totalAmountUsd: number; // Total amount in USD
  selectedChains: ChainData[];
  transactionCounts: Record<string, number>;
}

interface UseDepositReturn {
  deposit: () => void;
  approve: () => void;
  isLoading: boolean;
  isPending: boolean;
  isApproving: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  approvalTxHash: `0x${string}` | undefined;
  needsApproval: boolean;
}

/**
 * Hook to interact with the Gas Foundation deposit contract.
 * Converts USD amounts to USDC token amounts and calls the deposit function.
 */
export function useDeposit({
  totalAmountUsd,
  selectedChains,
  transactionCounts,
}: UseDepositOptions): UseDepositReturn {
  const { address } = useAccount();
  const [error, setError] = useState<Error | null>(null);

  // Prepare chain IDs and amounts
  const chainIds = selectedChains
    .map((chain) => getNumericChainId(chain.id))
    .filter((id): id is number => id !== undefined)
    .map((id) => BigInt(id));

  const chainAmounts = selectedChains.map((chain) => {
    const amountUsd = (transactionCounts[chain.id] || 10) * chain.avgTxCost;
    // Convert USD to USDC (6 decimals)
    return parseUnits(amountUsd.toFixed(6), USDC_DECIMALS);
  });

  // Convert total amount to USDC
  const totalAmount = parseUnits(totalAmountUsd.toFixed(6), USDC_DECIMALS);

  // Get USDC address on Base
  const usdcAddress = getTokenAddress("base", "USDC") as `0x${string}`;

  // Check current allowance
  const { data: allowance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, GAS_FOUNDATION_CONTRACT_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!usdcAddress,
    },
  });

  const needsApproval =
    !!address && !!allowance && allowance < totalAmount && totalAmount > 0n;

  // Approval transaction
  const {
    writeContract: writeApprove,
    data: approvalHash,
    isPending: isApprovingPending,
    error: approveError,
  } = useWriteContract();

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

  // Deposit transaction
  const {
    writeContract: writeDeposit,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isTxError,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Auto-deposit after approval succeeds
  useEffect(() => {
    if (isApprovalSuccess && needsApproval && !hash && chainIds.length > 0) {
      // Small delay to ensure approval is processed on-chain
      const timer = setTimeout(() => {
        if (chainIds.length === chainAmounts.length) {
          try {
            writeDeposit({
              address: GAS_FOUNDATION_CONTRACT_ADDRESS,
              abi: GAS_FOUNDATION_ABI,
              functionName: "deposit",
              args: [totalAmount, chainIds, chainAmounts],
            });
          } catch (err) {
            // Error will be caught by writeError
          }
        }
      }, 2000); // 2 second delay to ensure approval is confirmed
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApprovalSuccess, needsApproval, hash]);

  const approve = () => {
    setError(null);

    if (!usdcAddress) {
      setError(new Error("USDC address not found"));
      return;
    }

    try {
      writeApprove({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [GAS_FOUNDATION_CONTRACT_ADDRESS, maxUint256], // Approve max for convenience
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    }
  };

  const deposit = () => {
    setError(null);

    console.log("Deposit function called", {
      chainIds,
      chainAmounts,
      totalAmount: totalAmount.toString(),
      needsApproval,
      isApprovalSuccess,
    });

    if (chainIds.length === 0) {
      const err = new Error("No destination chains selected");
      setError(err);
      console.error("Deposit error:", err);
      return;
    }

    if (chainIds.length !== chainAmounts.length) {
      const err = new Error("Chain IDs and amounts mismatch");
      setError(err);
      console.error("Deposit error:", err);
      return;
    }

    // Check if approval is still needed
    if (needsApproval && !isApprovalSuccess) {
      const err = new Error("Please approve USDC spending first");
      setError(err);
      console.error("Deposit error:", err);
      return;
    }

    console.log("Calling writeDeposit with:", {
      address: GAS_FOUNDATION_CONTRACT_ADDRESS,
      functionName: "deposit",
      args: [
        totalAmount.toString(),
        chainIds.map((id) => id.toString()),
        chainAmounts.map((amt) => amt.toString()),
      ],
    });

    try {
      writeDeposit({
        address: GAS_FOUNDATION_CONTRACT_ADDRESS,
        abi: GAS_FOUNDATION_ABI,
        functionName: "deposit",
        args: [totalAmount, chainIds, chainAmounts],
      });
      console.log("writeDeposit called successfully");
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      console.error("Deposit error:", error);
    }
  };

  const finalError = error || writeError || txError || approveError || null;

  return {
    deposit,
    approve,
    isLoading:
      isPending || isConfirming || isApprovingPending || isApprovalConfirming,
    isPending,
    isApproving: isApprovingPending || isApprovalConfirming,
    isSuccess,
    isError: isTxError || !!finalError,
    error:
      finalError instanceof Error
        ? finalError
        : finalError
        ? new Error(String(finalError))
        : null,
    txHash: hash,
    approvalTxHash: approvalHash,
    needsApproval: needsApproval ?? false,
  };
}
