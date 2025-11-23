import React from "react";
import { X, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UnifiedBalance from "./unified-balance/unified-balance";

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BalanceModal: React.FC<BalanceModalProps> = ({ isOpen, onClose }) => {
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
          className="relative w-full max-w-3xl bg-[#1c1c1e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1c1c1e] z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Balances</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto custom-scrollbar">
            <UnifiedBalance className="max-w-full mx-0 mb-0" />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BalanceModal;


