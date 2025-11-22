import React, { useState } from "react";
import { Search, X, Check, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Token } from "../types";

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  selectedTokenSymbol?: string;
  tokens: Token[];
}

const TokenSelectorModal: React.FC<TokenSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedTokenSymbol,
  tokens,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Popular tokens (first 4)
  const popularTokens = tokens.slice(0, 4);

  // Filter tokens based on search
  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          className="relative w-full max-w-2xl bg-[#1c1c1e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1c1c1e] z-10">
            <h2 className="text-xl font-bold text-white">Select a token</h2>
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
                placeholder="Search tokens"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-secondary/50 text-white"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Popular Tokens Section */}
            {searchTerm === "" && (
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">
                    Popular Tokens
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {popularTokens.map((token) => {
                    const isSelected = selectedTokenSymbol === token.symbol;
                    return (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          onSelect(token);
                          onClose();
                        }}
                        className={clsx(
                          "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 group",
                          isSelected
                            ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(41,151,255,0.2)]"
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02]"
                        )}
                      >
                        <div className="relative">
                          {token.logo && !imageErrors.has(token.symbol) ? (
                            <img
                              src={token.logo}
                              alt={token.symbol}
                              className="w-12 h-12 rounded-full bg-white p-0.5 shadow-md"
                              onError={() => {
                                setImageErrors(
                                  (prev) => new Set([...prev, token.symbol])
                                );
                              }}
                            />
                          ) : (
                            <div
                              className={clsx(
                                "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold backdrop-blur-sm",
                                isSelected
                                  ? "bg-primary/20 text-primary"
                                  : "bg-white/5 text-white"
                              )}
                            >
                              {token.symbol.charAt(0)}
                            </div>
                          )}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5 border-2 border-[#1c1c1e]"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </div>
                        <div className="text-center w-full">
                          <div
                            className={clsx(
                              "text-xs font-bold truncate",
                              isSelected ? "text-primary" : "text-white"
                            )}
                          >
                            {token.symbol}
                          </div>
                          <div className="text-[10px] text-secondary mt-0.5 truncate">
                            {token.balance.toFixed(4)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Token List */}
            <div className="p-4">
              {searchTerm === "" && (
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">
                    Tokens
                  </h3>
                </div>
              )}

              <div className="space-y-1">
                {filteredTokens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-secondary">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No tokens found</p>
                    <p className="text-sm">Try searching for something else</p>
                  </div>
                ) : (
                  filteredTokens.map((token) => {
                    const isSelected = selectedTokenSymbol === token.symbol;
                    return (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          onSelect(token);
                          onClose();
                        }}
                        className={clsx(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group",
                          isSelected
                            ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(41,151,255,0.2)]"
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative shrink-0">
                            {token.logo && !imageErrors.has(token.symbol) ? (
                              <img
                                src={token.logo}
                                alt={token.symbol}
                                className="w-10 h-10 rounded-full bg-white p-0.5 shadow-md"
                                onError={() => {
                                  setImageErrors(
                                    (prev) => new Set([...prev, token.symbol])
                                  );
                                }}
                              />
                            ) : (
                              <div
                                className={clsx(
                                  "w-10 h-10 rounded-full flex items-center justify-center text-base font-bold backdrop-blur-sm",
                                  isSelected
                                    ? "bg-primary/20 text-primary"
                                    : "bg-white/5 text-white"
                                )}
                              >
                                {token.symbol.charAt(0)}
                              </div>
                            )}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5 border-2 border-[#1c1c1e]"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div
                              className={clsx(
                                "font-bold text-base truncate",
                                isSelected ? "text-primary" : "text-white"
                              )}
                            >
                              {token.name}
                            </div>
                            <div className="text-sm text-secondary font-medium truncate">
                              {token.symbol}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div
                            className={clsx(
                              "font-bold text-base",
                              isSelected ? "text-primary" : "text-white"
                            )}
                          >
                            {token.balance.toFixed(4)}
                          </div>
                          <div className="text-xs text-secondary">Balance</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TokenSelectorModal;
