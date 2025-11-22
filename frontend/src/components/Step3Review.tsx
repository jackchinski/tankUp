import React, { useState, useEffect } from "react";
import { useGasFountain } from "../context/GasFountainContext";
import VisualizationCanvas from "./VisualizationCanvas";
import { ChevronLeft, Check, Loader2, AlertCircle } from "lucide-react";
import { useDeposit } from "../hooks/useDeposit";
import { useAccount } from "wagmi";

type Status = "idle" | "dispersing" | "success" | "error";

const Step3Review: React.FC = () => {
  const {
    setCurrentStep,
    selectedChains,
    sourceChain,
    sourceToken,
    depositAmount,
    setHistory,
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
  } = useDeposit({
    totalAmountUsd: depositAmount,
    selectedChains,
    transactionCounts,
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
      // Only mark as success if we have a transaction hash
      setStatus("success");
      setTxHash(depositTxHash);
      // Store transaction hash in context for Step2Execution
      setDepositTxHash(depositTxHash);
      // Add to history
      setHistory((prev) => [
        {
          id: Date.now(),
          timestamp: Date.now(),
          amount: depositAmount,
          chains: selectedChains.length,
          status: "Success",
        },
        ...prev,
      ]);
      // Navigate to execution step after showing success message
      setTimeout(() => {
        setCurrentStep(3);
      }, 3000);
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
    depositAmount,
    selectedChains.length,
    setHistory,
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
    // Check if user is on Base network
    if (chainId !== 8453) {
      setStatus("error");
      return;
    }

    console.log("Disperse clicked", {
      needsApproval,
      approvalTxHash,
      selectedChains,
      depositAmount,
    });

    // If approval is needed and not yet approved, approve first
    // Otherwise, deposit
    if (needsApproval && !approvalTxHash) {
      console.log("Calling approve...");
      approve();
    } else {
      console.log("Calling deposit...", {
        totalAmountUsd: depositAmount,
        selectedChains: selectedChains.length,
      });
      deposit();
    }
  };

  const estimatedFees = 1.5; // Mock

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {status === "success" ? (
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Deposit Complete!</h3>
          <p className="text-secondary mb-8">
            You successfully deposited ${depositAmount.toFixed(2)} to disperse
            gas to {selectedChains.length} chains.
          </p>
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm mb-6"
            >
              View Transaction on BaseScan
            </a>
          )}
          <button
            onClick={() => setCurrentStep(3)}
            className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
          >
            View Dispersion Progress
          </button>
        </div>
      ) : (
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
                  status === "dispersing" || !address || chainId !== 8453
                }
                className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {status === "dispersing" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isApproving
                      ? "Approving..."
                      : isPending
                      ? "Confirming..."
                      : "Processing..."}
                  </>
                ) : needsApproval ? (
                  "Approve & Disperse Gas"
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
                        : chainId !== 8453
                        ? "Please switch to Base network (Chain ID: 8453)"
                        : "Unknown error occurred")}
                  </div>
                </div>
              </div>
            )}

            {(txHash || approvalTxHash) && (
              <div className="mt-4 text-center space-y-2">
                {approvalTxHash && (
                  <div>
                    <a
                      href={`https://basescan.org/tx/${approvalTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      View Approval on BaseScan
                    </a>
                  </div>
                )}
                {txHash && (
                  <div>
                    <a
                      href={`https://basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      View Deposit on BaseScan
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
              isCompleted={status === "success"}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Step3Review;
