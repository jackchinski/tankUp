import React, { useState } from "react";
import { Search, X, Check } from "lucide-react";
import { chains, SOURCE_CHAINS } from "../data/chains";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { ChainData } from "../types";

interface ChainSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chain: ChainData) => void;
  selectedChainId?: string;
}

const ChainSelectorModal: React.FC<ChainSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedChainId,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredChains = chains
    .filter(
      (chain) =>
        chain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chain.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aIsAvailable = SOURCE_CHAINS.some((sc) => sc.id === a.id);
      const bIsAvailable = SOURCE_CHAINS.some((sc) => sc.id === b.id);
      
      // Available chains first
      if (aIsAvailable && !bIsAvailable) return -1;
      if (!aIsAvailable && bIsAvailable) return 1;
      
      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-[#1c1c1e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1c1c1e] z-10">
            <h2 className="text-xl font-bold">Select Network</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-white/10 bg-[#1c1c1e]/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Search networks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-secondary/50"
              />
            </div>
          </div>

          {/* Chain Grid */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredChains.map((chain) => {
                const isSelected = selectedChainId === chain.id;
                const isAvailable = SOURCE_CHAINS.some(
                  (sc) => sc.id === chain.id
                );
                return (
                  <button
                    key={chain.id}
                    onClick={() => {
                      if (isAvailable) {
                        onSelect(chain);
                        onClose();
                      }
                    }}
                    disabled={!isAvailable}
                    className={clsx(
                      "flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 group",
                      !isAvailable && "opacity-40 cursor-not-allowed",
                      isSelected
                        ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(41,151,255,0.2)]"
                        : isAvailable
                        ? "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02]"
                        : "bg-white/5 border-white/5"
                    )}
                  >
                    <div className="relative">
                      <img
                        src={chain.logo}
                        alt={chain.name}
                        className="w-10 h-10 rounded-full bg-white p-0.5 shadow-lg"
                      />
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5 border-2 border-[#1c1c1e]">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div
                        className={clsx(
                          "font-bold text-lg flex items-center gap-2",
                          isSelected ? "text-primary" : "text-white"
                        )}
                      >
                        {chain.name}
                        {!isAvailable && (
                          <span className="text-xs text-secondary font-normal">
                            (Coming Soon)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-secondary font-medium">
                        {chain.symbol}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredChains.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-secondary">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No networks found</p>
                <p className="text-sm">Try searching for something else</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ChainSelectorModal;
