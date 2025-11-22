import React, { useState, useEffect, useRef } from "react";
import { useGasFountain } from "../context/GasFountainContext";
import VisualizationCanvas from "./VisualizationCanvas";
import { Check, Loader2 } from "lucide-react";
import { useMockIntentStatus } from "../hooks/useMockIntentStatus";

type Status = "dispersing" | "success";

const Step2Execution: React.FC = () => {
  const {
    setCurrentStep,
    selectedChains,
    depositAmount,
    setHistory,
    transactionCounts,
    depositTxHash,
  } = useGasFountain();

  // Use the actual deposit transaction hash, or generate a mock for demo
  const intentId =
    depositTxHash ||
    `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;

  const [status, setStatus] = useState<Status>("dispersing");
  const historyAddedRef = useRef(false);

  // Use mock hook to track intent status
  const { data: intentData } = useMockIntentStatus({
    intentId,
    selectedChains,
    transactionCounts,
    enabled: true,
    pollInterval: 3000,
  });

  // Update status and progress based on intent data
  useEffect(() => {
    if (!intentData?.intent) return;

    const intent = intentData.intent;

    // Check if all chains are confirmed (completed)
    const isCompleted =
      intent.status === "DISPERSED" || intent.globalPhase === "COMPLETED";

    if (isCompleted && status === "dispersing") {
      setStatus("success");

      // Add to history only once
      if (!historyAddedRef.current) {
        historyAddedRef.current = true;
        setHistory((prev) => [
          {
            id: Date.now(),
            timestamp: Date.now(),
            amount: depositAmount,
            chains: selectedChains.length,
            status: "Success" as const,
          },
          ...prev,
        ]);
      }
    }
  }, [intentData, status, depositAmount, selectedChains.length, setHistory]);

  // Get status message based on globalPhase
  const getStatusMessage = (): string => {
    if (!intentData?.intent) return "Bridging assets...";

    const phase = intentData.intent.globalPhase;
    switch (phase) {
      case "PREPARING_SWAP":
      case "SWAPPING":
        return "Swapping tokens...";
      case "DISPERSING":
        return "Finalizing dispersion...";
      case "COMPLETED":
        return "Dispersion complete!";
      default:
        return "Bridging assets...";
    }
  };

  if (status === "success") {
    return (
      <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Dispersion Complete!</h3>
          <p className="text-secondary mb-8">
            You successfully dispersed ${depositAmount.toFixed(2)} to{" "}
            {selectedChains.length} chains.
          </p>
          <button
            onClick={() => {
              setCurrentStep(1);
            }}
            className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
          >
            Start New Dispersion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
      <div className="glass-card rounded-2xl p-8 h-[800px] relative flex flex-col overflow-hidden">
        <div className="absolute top-8 left-8 z-30  rounded-lg px-4 py-2">
          <h2 className="text-xl font-bold mb-2">Dispersing Gas</h2>
          <div className="flex items-center gap-2 text-sm text-secondary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{getStatusMessage()}</span>
          </div>
        </div>

        <div className="flex-1 w-full h-full pt-20 relative overflow-hidden">
          <VisualizationCanvas
            isDispersing={true}
            isCompleted={
              intentData?.intent?.status === "DISPERSED" ||
              intentData?.intent?.globalPhase === "COMPLETED"
            }
            intentId={intentId}
          />
        </div>
      </div>
    </div>
  );
};

export default Step2Execution;
