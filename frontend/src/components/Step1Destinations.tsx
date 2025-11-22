import React, { useState, useEffect, useMemo } from "react";
import { useGasFountain } from "../context/GasFountainContext";
import { DESTINATION_CHAINS, SOURCE_CHAINS, chains } from "../data/chains";
import {
  Search,
  Settings2,
  ChevronDown,
  ChevronUp,
  Wallet,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import ChainSelectorModal from "./ChainSelectorModal";
import TokenSelectorModal from "./TokenSelectorModal";
import { ChainData } from "../types";

const Step1Destinations: React.FC = () => {
  const {
    selectedChains,
    setSelectedChains,
    transactionCounts,
    setTransactionCounts,
    setCurrentStep,
    setDepositAmount,
    sourceChain,
    setSourceChain,
    sourceToken,
    setSourceToken,
    depositAmount,
    tokenBalances,
    balancesLoading,
    isConnected,
  } = useGasFountain();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isChainModalOpen, setIsChainModalOpen] = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Get available tokens with balances for current chain
  const availableTokens = useMemo(() => {
    return tokenBalances || [];
  }, [tokenBalances]);

  // Initialize defaults
  useEffect(() => {
    if (!sourceChain) {
      // Find Base chain, or default to first available source chain
      const baseChain = SOURCE_CHAINS.find((chain) => chain.id === "base");
      setSourceChain(baseChain || SOURCE_CHAINS[0]);
    }
    if (!sourceToken && availableTokens.length > 0) {
      // Default to first token with balance, or USDC if available
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

  const toggleChain = (chain: ChainData): void => {
    if (selectedChains.find((c) => c.id === chain.id)) {
      setSelectedChains(selectedChains.filter((c) => c.id !== chain.id));
    } else {
      setSelectedChains([...selectedChains, chain]);
    }
  };

  const updateTransactionCount = (chainId: string, count: number): void => {
    setTransactionCounts((prev) => ({
      ...prev,
      [chainId]: count,
    }));
  };

  const totalCost = selectedChains.reduce((sum, chain) => {
    const count = transactionCounts[chain.id] || 10;
    return sum + count * chain.avgTxCost;
  }, 0);

  // Update deposit amount in context whenever total cost changes
  useEffect(() => {
    setDepositAmount(totalCost);
  }, [totalCost, setDepositAmount]);

  // Show all chains, but mark which are available and sort available ones first
  const allFilteredChains = chains.filter((chain) =>
    chain.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredChains = allFilteredChains
    .map((chain) => ({
      ...chain,
      isAvailable: DESTINATION_CHAINS.some((dc) => dc.id === chain.id),
    }))
    .sort((a, b) => {
      // Available chains first
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });

  const isInsufficient = depositAmount < totalCost;
  const isBalanceInsufficient =
    sourceToken && isConnected && depositAmount > (sourceToken.balance || 0);

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <ChainSelectorModal
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
        onSelect={(chain) => {
          setSourceChain(chain);
          setIsChainModalOpen(false);
        }}
        selectedChainId={sourceChain?.id}
      />
      <TokenSelectorModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onSelect={setSourceToken}
        selectedTokenSymbol={sourceToken?.symbol}
        tokens={availableTokens}
      />

      {/* Summary Card */}
      <div className="glass-card rounded-3xl p-8 mb-6 relative overflow-hidden border-white/20 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-5xl font-bold mb-2 text-white tracking-tight">
              ${totalCost.toFixed(2)}
            </h1>
            <p className="text-white/80 font-medium text-lg">
              Total estimated cost for{" "}
              <span className="text-white font-bold">
                {selectedChains.length} chains
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="px-5 py-2.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2 text-sm font-semibold text-white backdrop-blur-md"
            >
              <Settings2 className="w-4 h-4" />
              {isConfigOpen ? "Hide Options" : "Customize"}
              {isConfigOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none mix-blend-overlay" />
      </div>

      {/* Collapsible Configuration */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
              {/* Left Column: Chain Selector */}
              <div className="glass-card rounded-3xl p-6 h-[500px] flex flex-col border-white/10 bg-black/20">
                <div className="mb-4">
                  <h2 className="text-lg font-bold mb-1 text-white">
                    Select Chains
                  </h2>
                  <p className="text-xs text-white/60">
                    Choose destination networks.
                  </p>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                  {filteredChains.map((chain) => {
                    const isSelected = selectedChains.find(
                      (c) => c.id === chain.id
                    );
                    const isAvailable = chain.isAvailable;
                    return (
                      <div
                        key={chain.id}
                        onClick={() => isAvailable && toggleChain(chain)}
                        className={clsx(
                          "p-3 rounded-xl border transition-all flex items-center justify-between group",
                          isAvailable
                            ? "cursor-pointer"
                            : "cursor-not-allowed opacity-40",
                          isSelected
                            ? "bg-white/20 border-white/40 shadow-lg"
                            : isAvailable
                            ? "bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10"
                            : "bg-transparent border-white/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={chain.logo}
                            alt={chain.name}
                            className={clsx(
                              "w-8 h-8 rounded-full bg-white p-0.5",
                              !isAvailable && "grayscale opacity-50"
                            )}
                          />
                          <div>
                            <div className="font-bold text-sm text-white flex items-center gap-2">
                              {chain.name}
                              {!isAvailable && (
                                <span className="text-[10px] text-white/40 font-normal">
                                  (Coming Soon)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-white/60">
                              {chain.symbol}
                            </div>
                          </div>
                        </div>
                        <div
                          className={clsx(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-white border-white"
                              : isAvailable
                              ? "border-white/20 group-hover:border-white/40"
                              : "border-white/10"
                          )}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 bg-black rounded-full" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Transaction Configuration */}
              <div className="glass-card rounded-3xl p-6 h-[500px] flex flex-col border-white/10 bg-black/20">
                <div className="mb-4">
                  <h2 className="text-lg font-bold mb-1 text-white">
                    Transaction Count
                  </h2>
                  <p className="text-xs text-white/60">
                    Adjust transactions per chain.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                  {selectedChains.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/40 text-center p-4">
                      <Settings2 className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">
                        Select chains to configure transactions.
                      </p>
                    </div>
                  ) : (
                    selectedChains.map((chain) => (
                      <div
                        key={chain.id}
                        className="bg-white/5 p-4 rounded-2xl border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={chain.logo}
                              alt={chain.name}
                              className="w-5 h-5 rounded-full bg-white p-0.5"
                            />
                            <span className="font-bold text-sm text-white">
                              {chain.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-white">
                              $
                              {(
                                (transactionCounts[chain.id] || 10) *
                                chain.avgTxCost
                              ).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-white/60">
                              ~${chain.avgTxCost} / tx
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-white/60">
                              Tx Count:{" "}
                              <span className="text-white font-bold">
                                {transactionCounts[chain.id] || 10}
                              </span>
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="50"
                            value={transactionCounts[chain.id] || 10}
                            onChange={(e) =>
                              updateTransactionCount(
                                chain.id,
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Source Selection Card */}
      <div className="glass-card rounded-3xl p-8 mb-8 border-white/20 bg-black/20 shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 text-white">
            Fund & Disperse
          </h2>
          <p className="text-white/60 text-sm">
            Select your source chain and token.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source Chain */}
          <div>
            <label className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3 block">
              Source Chain
            </label>
            <button
              onClick={() => setIsChainModalOpen(true)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <img
                  src={
                    sourceChain?.logo ||
                    SOURCE_CHAINS.find((c) => c.id === "base")?.logo ||
                    SOURCE_CHAINS[0]?.logo
                  }
                  alt="chain"
                  className="w-10 h-10 rounded-full bg-white p-0.5 shadow-md group-hover:scale-110 transition-transform"
                />
                <div className="text-left">
                  <div className="font-bold text-lg text-white">
                    {sourceChain?.name || "Select Chain"}
                  </div>
                  <div className="text-xs text-white/60 font-medium">
                    {sourceChain?.symbol}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Token */}
          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
              Token to Deposit
            </label>
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 hover:border-white/20 transition-all group"
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
        </div>

        {/* Amount Display */}
        <div className="mt-6">
          <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
            Required Deposit (USD)
          </label>
          <div className="bg-background/50 p-4 rounded-xl border border-border backdrop-blur-sm relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold text-secondary">$</span>
              <span className="text-3xl font-bold">
                {depositAmount.toFixed(2)}
              </span>
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

        {/* Validation Messages */}
        <div className="mt-4 space-y-2">
          {isInsufficient && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs text-red-200">
                <span className="font-bold block text-red-500">
                  Insufficient Deposit
                </span>
                Minimum required: ${totalCost.toFixed(2)}
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

      {/* Main Action Button */}
      <button
        onClick={() => setCurrentStep(2)}
        disabled={
          isInsufficient || isBalanceInsufficient || selectedChains.length === 0
        }
        className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 text-lg"
      >
        Review & Deposit
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Step1Destinations;
