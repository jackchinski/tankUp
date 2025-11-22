import React, { useState, useEffect, useMemo } from "react";
import { useGasFountain } from "../context/GasFountainContext";
import { SOURCE_CHAINS } from "../data/chains";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  AlertCircle,
  Check,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import VisualizationCanvas from "./VisualizationCanvas";
import TokenSelectorModal from "./TokenSelectorModal";

type Status = "idle" | "dispersing" | "success" | "error";

const Step2Source: React.FC = () => {
  const {
    setCurrentStep,
    sourceChain,
    setSourceChain,
    sourceToken,
    setSourceToken,
    depositAmount,
    setDepositAmount,
    selectedChains,
    transactionCounts,
    setHistory,
    tokenBalances,
    balancesLoading,
    isConnected,
  } = useGasFountain();

  const [status, setStatus] = useState<Status>("idle"); // idle, dispersing, success, error
  const [progressStep, setProgressStep] = useState<number>(0); // 0: Idle, 1: Swapping, 2: Bridging, 3: Dispersing
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Get available tokens with balances for current chain
  const availableTokens = useMemo(() => {
    return tokenBalances || [];
  }, [tokenBalances]);

  // Initialize defaults
  useEffect(() => {
    if (!sourceChain) setSourceChain(SOURCE_CHAINS[0]);
    if (!sourceToken && availableTokens.length > 0) {
      const usdc = availableTokens.find((t) => t.symbol === "USDC");
      setSourceToken(usdc || availableTokens[0]);
    }
  }, [
    availableTokens,
    sourceChain,
    sourceToken,
    setSourceChain,
    setSourceToken,
  ]);

  const handleBack = (): void => setCurrentStep(1);

  const handleDisperse = (): void => {
    setStatus("dispersing");
    setProgressStep(1);

    // Mock sequence
    setTimeout(() => setProgressStep(2), 2000);
    setTimeout(() => setProgressStep(3), 4000);
    setTimeout(() => {
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
  };

  // Re-calculate total required
  const totalRequired = selectedChains.reduce((sum, chain) => {
    const count = transactionCounts[chain.id] || 10;
    return sum + count * chain.avgTxCost;
  }, 0);

  const isInsufficient = depositAmount < totalRequired;
  const isBalanceInsufficient =
    sourceToken && isConnected && depositAmount > (sourceToken.balance || 0);
  const estimatedFees = 1.5; // Mock

  if (status === "success") {
    return (
      <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Dispersion Complete!</h3>
          <p className="text-secondary mb-8">
            You successfully dispersed ${depositAmount} to{" "}
            {selectedChains.length} chains.
          </p>
          <button
            onClick={() => {
              setStatus("idle");
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <TokenSelectorModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onSelect={setSourceToken}
        selectedTokenSymbol={sourceToken?.symbol}
        tokens={availableTokens}
      />

      {/* Left Column: Source & Funding */}
      <div className="glass-card rounded-2xl p-6 flex flex-col h-auto lg:h-[600px]">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Fund & Disperse</h2>
          <p className="text-secondary text-sm">
            Select source and confirm dispersion.
          </p>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
          {/* Source Chain */}
          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
              Source Chain
            </label>
            <div className="relative">
              <select
                value={sourceChain?.id}
                onChange={(e) =>
                  setSourceChain(
                    SOURCE_CHAINS.find((c) => c.id === e.target.value)!
                  )
                }
                disabled={status === "dispersing"}
                className="w-full bg-background/50 border border-border rounded-xl p-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-sm disabled:opacity-50"
              >
                {SOURCE_CHAINS.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
                {chains
                  .filter((c) => !SOURCE_CHAINS.find((sc) => sc.id === c.id))
                  .map((chain) => (
                    <option key={chain.id} value={chain.id} disabled>
                      {chain.name} (Coming Soon)
                    </option>
                  ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <img
                  src={sourceChain?.logo || SOURCE_CHAINS[0].logo}
                  alt="chain"
                  className="w-6 h-6 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Token */}
          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
              Token to Deposit
            </label>
            <button
              onClick={() =>
                status !== "dispersing" && setIsTokenModalOpen(true)
              }
              disabled={status === "dispersing"}
              className={clsx(
                "w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all group",
                status === "dispersing"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-center gap-3">
                {sourceToken ? (
                  <>
                    {sourceToken.logo &&
                    !imageErrors.has(sourceToken.symbol) ? (
                      <img
                        src={sourceToken.logo}
                        alt={sourceToken.symbol}
                        className="w-10 h-10 rounded-full bg-white p-0.5 shadow-md"
                        onError={() => {
                          setImageErrors(
                            (prev) => new Set([...prev, sourceToken.symbol])
                          );
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-base font-bold">
                        {sourceToken.symbol.charAt(0)}
                      </div>
                    )}
                    <div className="text-left">
                      <div className="font-bold text-lg text-white">
                        {sourceToken.name}
                      </div>
                      <div className="text-xs text-white/60 font-medium">
                        {sourceToken.symbol}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white/40" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-lg text-white">
                        Select token
                      </div>
                      <div className="text-xs text-white/60 font-medium">
                        Choose a token
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {sourceToken && (
                  <div className="text-right mr-2">
                    <div className="text-sm font-bold text-white">
                      {sourceToken.balance}
                    </div>
                    <div className="text-[10px] text-white/60">Balance</div>
                  </div>
                )}
                <ChevronDown className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
              </div>
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
              Required Deposit (USD)
            </label>
            <div className="bg-background/50 p-4 rounded-xl border border-border backdrop-blur-sm relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-secondary">$</span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) =>
                    setDepositAmount(parseFloat(e.target.value) || 0)
                  }
                  disabled={status === "dispersing"}
                  className="bg-transparent text-3xl font-bold w-full focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary">
                <Wallet className="w-3 h-3" />
                <span>
                  {balancesLoading
                    ? "Loading..."
                    : isConnected
                    ? `Wallet Balance: ${
                        sourceToken?.balance?.toFixed(4) || "0"
                      } ${sourceToken?.symbol || ""}`
                    : "Connect wallet to see balance"}
                </span>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-background/30 p-4 rounded-xl border border-border space-y-2 backdrop-blur-sm">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Total Required</span>
              <span className="font-medium">${totalRequired.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Est. Fees</span>
              <span className="font-medium">~${estimatedFees.toFixed(2)}</span>
            </div>
          </div>

          {/* Validation Messages */}
          <div className="space-y-2">
            {isInsufficient && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 backdrop-blur-sm">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-200">
                  <span className="font-bold block text-red-500">
                    Insufficient Deposit
                  </span>
                  Minimum required: ${totalRequired.toFixed(2)}
                </div>
              </div>
            )}

            {isBalanceInsufficient && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 backdrop-blur-sm">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-200">
                  <span className="font-bold block text-red-500">
                    Insufficient Balance
                  </span>
                  You need more {sourceToken?.symbol}.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border flex gap-4">
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
              isInsufficient || isBalanceInsufficient || status === "dispersing"
            }
            className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {status === "dispersing" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {progressStep === 1
                  ? "Swapping..."
                  : progressStep === 2
                  ? "Bridging..."
                  : "Dispersing..."}
              </>
            ) : (
              <>
                Disperse Gas
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Visualization */}
      <div className="h-[400px] lg:h-[600px]">
        <VisualizationCanvas
          isDispersing={status === "dispersing"}
          isCompleted={false}
        />
      </div>
    </div>
  );
};

export default Step2Source;
