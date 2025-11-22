import React, { useState, useEffect } from "react";
import { useGasFountain } from "../context/GasFountainContext";
import VisualizationCanvas from "./VisualizationCanvas";
import { Check, Loader2 } from "lucide-react";

type Status = "dispersing" | "success";

const Step2Execution: React.FC = () => {
  const { setCurrentStep, selectedChains, depositAmount, setHistory } =
    useGasFountain();

  const [status, setStatus] = useState<Status>("dispersing"); // Start dispersing immediately
  const [progressStep, setProgressStep] = useState<number>(1); // 1: Swapping, 2: Bridging, 3: Dispersing

  useEffect(() => {
    // Mock sequence
    const timer1 = setTimeout(() => setProgressStep(2), 2000);
    const timer2 = setTimeout(() => setProgressStep(3), 4000);
    const timer3 = setTimeout(() => {
      setStatus("success");
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
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [depositAmount, selectedChains.length, setHistory]);

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
    <div className="w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-card rounded-2xl p-8 h-[700px] relative flex flex-col">
        <div className="absolute top-8 left-8 z-10 px-4 py-3 glass-card rounded-xl backdrop-blur-md">
          <h2 className="text-xl font-bold mb-1">Dispersing Gas</h2>
          <div className="flex items-center gap-2 text-sm text-secondary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {progressStep === 1
                ? "Swapping tokens..."
                : progressStep === 2
                ? "Bridging assets..."
                : "Finalizing dispersion..."}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full h-full pt-4">
          <VisualizationCanvas isDispersing={true} isCompleted={false} />
        </div>
      </div>
    </div>
  );
};

export default Step2Execution;
