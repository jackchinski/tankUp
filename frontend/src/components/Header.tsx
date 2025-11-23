import React, { useState } from "react";
import { Droplets } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import BalanceModal from "./BalanceModal";

const Header: React.FC = () => {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const [isBalancesOpen, setIsBalancesOpen] = useState(false);

  const handleConnect = (): void => {
    if (isConnected) {
      open({ view: "Account" });
    } else {
      open();
    }
  };

  const formatAddress = (addr: `0x${string}` | undefined): string => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6 mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg">
          <Droplets className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Gas Fountain
          </h1>
          <p className="text-sm text-secondary font-medium">
            One deposit. Gas everywhere.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsBalancesOpen(true)}
          className="px-5 py-2.5 rounded-full font-medium transition-colors bg-white/5 border border-white/10 text-white hover:bg-white/10"
        >
          Show Balances
        </button>
        <button
          onClick={handleConnect}
          className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 backdrop-blur-md border ${
            isConnected
              ? "bg-white/5 border-white/10 text-secondary hover:bg-white/10"
              : "bg-primary/90 border-primary/50 text-white hover:bg-primary shadow-[0_0_20px_rgba(41,151,255,0.3)]"
          }`}
        >
          {isConnected ? formatAddress(address) : "Connect Wallet"}
        </button>
      </div>

      <BalanceModal isOpen={isBalancesOpen} onClose={() => setIsBalancesOpen(false)} />
    </div>
  );
};

export default Header;
