import React, { useState, useEffect } from "react";
import { useGasFountain } from "../context/GasFountainContext";
import VisualizationCanvas from "./VisualizationCanvas";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { useDeposit } from "../hooks/useDeposit";
import { useAccount } from "wagmi";
import { getExplorerUrl } from "../data/chains";

type Status = "idle" | "dispersing" | "error";

const Step3Review: React.FC = () => {
  const {
    setCurrentStep,
    selectedChains,
    sourceChain,
    depositAmount,
    transactionCounts,
    setDepositTxHash,
  } = useGasFountain();

  const { address, chainId } = useAccount();
  const [status, setStatus] = useState<Status>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const {
    deposit,
    approve,
    isLoading,
    isPending,
    isApproving,
    isSuccess,
    isError,
    error,
    txHash: depositTxHash,
    approvalTxHash,
    needsApproval,
    isApprovalSuccess,
  } = useDeposit({
    totalAmountUsd: depositAmount,
    selectedChains,
    transactionCounts,
    sourceChain,
  });

  // Update status based on deposit hook state
  useEffect(() => {
    console.log("Deposit state:", {
      isLoading,
      isPending,
      isApproving,
      isSuccess,
      isError,
      depositTxHash,
      error: error?.message,
    });

    if (isLoading || isPending || isApproving) {
      setStatus("dispersing");
    } else if (isSuccess && depositTxHash) {
      // Deposit transaction confirmed - navigate to execution step immediately
      // Don't show success here - let Step2Execution handle that after polling confirms dispersion
      setTxHash(depositTxHash);
      // Store transaction hash in context for Step2Execution
      setDepositTxHash(depositTxHash);
      // Navigate to execution step immediately to start polling
      setCurrentStep(3);
    } else if (isError) {
      setStatus("error");
      console.error("Deposit error:", error);
    }
  }, [
    isLoading,
    isPending,
    isApproving,
    isSuccess,
    isError,
    depositTxHash,
    setCurrentStep,
    setDepositTxHash,
    error,
  ]);

  const handleBack = (): void => setCurrentStep(1);

  const handleDisperse = (): void => {
    if (!address) {
      setStatus("error");
      return;
    }
    // Check if user is on the selected source chain
    // Contracts are deployed on Base (8453) and Arbitrum (42161)
    const requiredChainId = sourceChain?.viemChain?.id;
    if (!requiredChainId) {
      setStatus("error");
      return;
    }
    if (chainId !== requiredChainId) {
      setStatus("error");
      return;
    }

    console.log("Disperse clicked", {
      needsApproval,
      approvalTxHash,
      selectedChains,
      depositAmount,
      address,
      chainId,
      requiredChainId: sourceChain?.viemChain?.id,
    });

    // ALWAYS check approval first - if needed, approve, otherwise deposit
    if (needsApproval) {
      if (!approvalTxHash) {
        console.log("Approval needed - calling approve...");
        approve();
      } else {
        console.log(
          "Approval transaction pending, waiting for confirmation..."
        );
        // Don't call deposit yet - wait for user to click again after approval
      }
    } else {
      // Approval not needed or already approved - proceed with deposit
      console.log(
        "Approval not needed or already approved - calling deposit...",
        {
          totalAmountUsd: depositAmount,
          selectedChains: selectedChains.length,
          isApprovalSuccess,
        }
      );
      deposit();
    }
  };

  const estimatedFees = 1.5; // Mock

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <>
        {/* Review Summary - Compact at Top */}
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">Review Dispersion</h2>
            <p className="text-secondary text-sm">
              Confirm details before sending.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Source Info */}
            <div className="bg-background/30 p-4 rounded-xl border border-border backdrop-blur-sm">
              <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                Source
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={sourceChain?.logo}
                    alt="Source"
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="font-medium">{sourceChain?.name}</span>
                </div>
                <div className="font-bold text-sm">
                  {depositAmount.toFixed(2)} USD
                </div>
              </div>
            </div>

            {/* Destinations Summary */}
            <div className="bg-background/30 p-4 rounded-xl border border-border backdrop-blur-sm">
              <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                Destinations
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {selectedChains.length} chains
                </span>
                <div className="flex gap-1">
                  {selectedChains.slice(0, 3).map((chain) => (
                    <img
                      key={chain.id}
                      src={chain.logo}
                      alt={chain.name}
                      className="w-5 h-5 rounded-full"
                    />
                  ))}
                  {selectedChains.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">
                      +{selectedChains.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Total Cost */}
            <div className="bg-background/30 p-4 rounded-xl border border-border backdrop-blur-sm">
              <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                Total Cost
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">
                  ${(depositAmount + estimatedFees).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-secondary mt-1">
                Deposit: ${depositAmount.toFixed(2)} + Fees: $
                {estimatedFees.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-2 bg-black/20 rounded text-xs text-white/60 font-mono">
              <div>
                Button State: needsApproval={String(needsApproval)},
                isApproving={String(isApproving)}, status={status}
              </div>
              <div>
                Chain: chainId={chainId}, required={sourceChain?.viemChain?.id},
                match={String(chainId === sourceChain?.viemChain?.id)}
              </div>
              <div>Address: {address ? "connected" : "not connected"}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-border">
            <button
              onClick={handleBack}
              disabled={status === "dispersing"}
              className="flex-1 py-3 bg-muted text-secondary rounded-xl font-bold hover:bg-border transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={handleDisperse}
              disabled={
                status === "dispersing" ||
                isApproving ||
                !address ||
                (sourceChain?.viemChain?.id &&
                  chainId !== sourceChain.viemChain.id)
              }
              title={
                !address
                  ? "Please connect your wallet"
                  : sourceChain?.viemChain?.id &&
                    chainId !== sourceChain.viemChain.id
                  ? `Please switch to ${sourceChain.name} network`
                  : needsApproval
                  ? "Click to approve USDC spending"
                  : "Click to disperse gas"
              }
              className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {status === "dispersing" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isApproving
                    ? "Approving USDC..."
                    : isPending
                    ? "Confirming Deposit..."
                    : "Processing..."}
                </>
              ) : isApproving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Approving USDC...
                </>
              ) : needsApproval ? (
                "Approve USDC"
              ) : (
                "Disperse Gas"
              )}
            </button>
          </div>

          {status === "error" && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-500">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold mb-1">Transaction Failed</div>
                <div className="text-sm break-words line-clamp-3">
                  {error?.message ||
                    (!address
                      ? "Please connect your wallet"
                      : chainId !== (sourceChain?.viemChain?.id || 8453)
                      ? `Please switch to ${
                          sourceChain?.name || "Base"
                        } network`
                      : "Unknown error occurred")}
                </div>
              </div>
            </div>
          )}

          {(txHash || approvalTxHash) && sourceChain && (
            <div className="mt-4 text-center space-y-2">
              {approvalTxHash && (
                <div>
                  <a
                    href={`${getExplorerUrl(
                      sourceChain.id
                    )}/tx/${approvalTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View Approval on {sourceChain.name} Explorer
                  </a>
                </div>
              )}
              {txHash && (
                <div>
                  <a
                    href={`${getExplorerUrl(sourceChain.id)}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View Deposit on {sourceChain.name} Explorer
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Full Width Visualization */}
        <div className="w-full h-[600px] lg:h-[800px] glass-card rounded-2xl p-4 overflow-hidden">
          <VisualizationCanvas
            isDispersing={status === "dispersing"}
            isCompleted={false}
          />
        </div>
      </>
    </div>
  );
};

export default Step3Review;
