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
  getContractAddress,
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
  sourceChain: ChainData | null; // Source chain to determine contract address
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
  isApprovalSuccess: boolean;
}

/**
 * Hook to interact with the Gas Foundation deposit contract.
 * Converts USD amounts to USDC token amounts and calls the deposit function.
 */
export function useDeposit({
  totalAmountUsd,
  selectedChains,
  transactionCounts,
  sourceChain,
}: UseDepositOptions): UseDepositReturn {
  const { address } = useAccount();
  const [error, setError] = useState<Error | null>(null);

  // Get contract address based on source chain
  const contractAddress = sourceChain
    ? getContractAddress(sourceChain.id) || GAS_FOUNDATION_CONTRACT_ADDRESS
    : GAS_FOUNDATION_CONTRACT_ADDRESS;

  // Get USDC address on source chain
  const usdcAddress = sourceChain
    ? (getTokenAddress(sourceChain.id, "USDC") as `0x${string}` | null)
    : (getTokenAddress("base", "USDC") as `0x${string}` | null);

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

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress || undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && usdcAddress ? [address, contractAddress] : undefined,
    query: {
      enabled: !!address && !!usdcAddress,
    },
  });

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

  // Check if approval is needed
  // Approval is needed if allowance is less than totalAmount
  // If allowance is sufficient, we don't need approval regardless of isApprovalSuccess
  const needsApproval =
    !!address &&
    !!usdcAddress &&
    !!contractAddress &&
    totalAmount > 0n &&
    (allowance === undefined || allowance < totalAmount);

  // Debug logging
  useEffect(() => {
    if (address && usdcAddress && contractAddress) {
      console.log("Approval check:", {
        needsApproval,
        allowance: allowance?.toString(),
        totalAmount: totalAmount.toString(),
        hasAddress: !!address,
        hasUsdcAddress: !!usdcAddress,
        hasContractAddress: !!contractAddress,
      });
    }
  }, [
    needsApproval,
    allowance,
    totalAmount,
    address,
    usdcAddress,
    contractAddress,
  ]);

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

  // Refetch allowance after approval succeeds to verify it was updated
  useEffect(() => {
    if (isApprovalSuccess && approvalHash) {
      console.log("Approval confirmed, refetching allowance...");
      // Refetch allowance after a short delay to ensure it's updated on-chain
      setTimeout(() => {
        refetchAllowance();
      }, 2000);
    }
  }, [isApprovalSuccess, approvalHash, refetchAllowance]);

  const approve = () => {
    setError(null);

    if (!usdcAddress) {
      const err = new Error("USDC address not found");
      setError(err);
      console.error("Approval error:", err);
      return;
    }

    if (!contractAddress) {
      const err = new Error("Contract address not found");
      setError(err);
      console.error("Approval error:", err);
      return;
    }

    console.log("=== APPROVING USDC ===");
    console.log("USDC Address:", usdcAddress);
    console.log("Contract Address:", contractAddress);
    console.log("Amount to approve: MAX (maxUint256)");
    console.log("Current allowance:", allowance?.toString() || "unknown");
    console.log("Required amount:", totalAmount.toString());
    console.log("====================");

    try {
      writeApprove({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [contractAddress, maxUint256], // Approve max for convenience
      });
      console.log("✓ Approval transaction sent");
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      console.error("Approval error:", error);
    }
  };

  const deposit = () => {
    setError(null);

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

    // CRITICAL: Always check if approval is needed before depositing
    if (needsApproval) {
      if (!isApprovalSuccess) {
        const err = new Error(
          "USDC approval required. Please approve USDC spending first."
        );
        setError(err);
        console.error("Deposit error:", err);
        console.log("Current allowance:", allowance?.toString() || "unknown");
        console.log("Required amount:", totalAmount.toString());
        return;
      }
      // If approval was successful but allowance hasn't updated yet, wait
      if (allowance === undefined || allowance < totalAmount) {
        const err = new Error(
          "Waiting for approval to be confirmed. Please try again in a moment."
        );
        setError(err);
        console.error("Deposit error:", err);
        console.log("Current allowance:", allowance?.toString() || "unknown");
        console.log("Required amount:", totalAmount.toString());
        return;
      }
    }

    // Calculate sum of chain amounts to verify it matches totalAmount
    const sumOfChainAmounts = chainAmounts.reduce(
      (sum, amount) => sum + amount,
      0n
    );

    // Build detailed payload log
    const payloadDetails = {
      selectedChains: selectedChains.map((chain, index) => ({
        name: chain.name,
        id: chain.id,
        numericChainId: chainIds[index]?.toString(),
        amountUsd: (transactionCounts[chain.id] || 10) * chain.avgTxCost,
        amountUsdc: chainAmounts[index]?.toString(),
        transactionCount: transactionCounts[chain.id] || 10,
      })),
      arrays: {
        chainIds: chainIds.map((id) => id.toString()),
        chainAmounts: chainAmounts.map((amt) => amt.toString()),
      },
      totals: {
        totalAmountUsd: totalAmountUsd,
        totalAmountUsdc: totalAmount.toString(),
        sumOfChainAmountsUsdc: sumOfChainAmounts.toString(),
        amountsMatch: sumOfChainAmounts === totalAmount,
      },
      validation: {
        chainIdsLength: chainIds.length,
        chainAmountsLength: chainAmounts.length,
        arraysMatch: chainIds.length === chainAmounts.length,
        sumMatchesTotal: sumOfChainAmounts === totalAmount,
      },
    };

    console.log("=== DEPOSIT PAYLOAD ===");
    console.log("Selected Chains with Amounts:", payloadDetails.selectedChains);
    console.log("Chain IDs Array:", payloadDetails.arrays.chainIds);
    console.log(
      "Chain Amounts Array (USDC):",
      payloadDetails.arrays.chainAmounts
    );
    console.log("Total Amount (USDC):", payloadDetails.totals.totalAmountUsdc);
    console.log(
      "Sum of Chain Amounts (USDC):",
      payloadDetails.totals.sumOfChainAmountsUsdc
    );
    console.log("Validation:", payloadDetails.validation);
    console.log("======================");

    // Verify sum matches total
    if (sumOfChainAmounts !== totalAmount) {
      const err = new Error(
        `Amounts do not sum to totalAmount. Sum: ${sumOfChainAmounts.toString()}, Total: ${totalAmount.toString()}`
      );
      setError(err);
      console.error("Deposit validation error:", err);
      return;
    }

    // Final contract call payload
    console.log("Contract Call Payload:", {
      address: contractAddress,
      sourceChain: sourceChain?.name || "Unknown",
      functionName: "deposit",
      args: [
        totalAmount.toString(), // totalAmount
        chainIds.map((id) => id.toString()), // chainIds
        chainAmounts.map((amt) => amt.toString()), // chainAmounts
      ],
    });

    try {
      writeDeposit({
        address: contractAddress,
        abi: GAS_FOUNDATION_ABI,
        functionName: "deposit",
        args: [totalAmount, chainIds, chainAmounts],
      });
      console.log("✓ writeDeposit called successfully");
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
    isApprovalSuccess: isApprovalSuccess ?? false,
  };
}
