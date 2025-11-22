import React from "react";
import { Droplets, Sun, Moon } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { useTheme } from "../context/ThemeContext";

const Header: React.FC = () => {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { theme, toggleTheme } = useTheme();

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
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-border pb-6 mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 glass-card rounded-2xl shadow-lg">
          <Droplets className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Gas Fountain
          </h1>
          <p className="text-sm text-secondary font-medium">
            One deposit. Gas everywhere.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2.5 glass-card rounded-full transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 text-foreground" />
          ) : (
            <Sun className="w-5 h-5 text-foreground" />
          )}
        </button>

        <button
          onClick={handleConnect}
          className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 backdrop-blur-md border ${
            isConnected
              ? "glass-card text-secondary hover:bg-opacity-80"
              : "bg-primary/90 border-primary/50 text-white hover:bg-primary shadow-[0_0_20px_rgba(41,151,255,0.3)] dark:shadow-[0_0_20px_rgba(41,151,255,0.3)]"
          }`}
        >
          {isConnected ? formatAddress(address) : "Connect Wallet"}
        </button>
      </div>
    </div>
  );
};

export default Header;
