"use client";
import React, { memo, useMemo, useState } from "react";
import { useNexus } from "../nexus/NexusProvider";
import { DollarSign, RefreshCw, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Separator } from "../ui/separator";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UnifiedBalance = ({ className }: { className?: string }) => {
  const { unifiedBalance, nexusSDK, fetchUnifiedBalance } = useNexus();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async (): Promise<void> => {
    try {
      setRefreshing(true);
      await fetchUnifiedBalance?.();
    } finally {
      setRefreshing(false);
    }
  };

  const totalFiat = useMemo(() => {
    if (!unifiedBalance) return "0.00";
    const total = unifiedBalance.reduce((acc, fiat) => acc + fiat.balanceInFiat, 0);
    return total.toFixed(2);
  }, [unifiedBalance]);

  const tokens = useMemo(() => {
    return (unifiedBalance ?? []).filter((token) => Number.parseFloat(token.balance) > 0);
  }, [unifiedBalance]);

  return (
    <div className={cn("glass-card rounded-3xl p-6 mb-6 w-full max-w-4xl mx-auto", className)}>
      <div className="flex items-center justify-between w-full mb-3">
        <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">Total Balance</div>
        <div className="inline-flex items-center gap-3">
          <div className="inline-flex items-center gap-1 text-white font-bold text-lg">
            <DollarSign className="w-4 h-4 text-primary" strokeWidth={3} />
            <span>{totalFiat}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-50"
            aria-label="Refresh balances"
            title="Refresh balances"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <Accordion type="single" collapsible className="w-full space-y-3">
        {tokens.map((token) => {
          const positiveBreakdown = token.breakdown.filter((chain) => Number.parseFloat(chain.balance) > 0);
          const chainsCount = positiveBreakdown.length;
          const chainsLabel = chainsCount > 1 ? `${chainsCount} chains` : `${chainsCount} chain`;
          return (
            <AccordionItem
              key={token.symbol}
              value={token.symbol}
              className="bg-white/5 border border-white/10 rounded-2xl"
            >
              <AccordionTrigger
                className="hover:no-underline cursor-pointer items-center px-4 py-3 rounded-2xl hover:bg-white/10"
                hideChevron={false}
              >
                <div className="flex items-center justify-between w-full gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative size-7">
                      {token.icon && (
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          className="rounded-full size-full ring-1 ring-white/20"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-white">{token.symbol}</h3>
                      <p className="text-xs text-white/60">{chainsLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <p className="text-sm font-semibold text-white">
                        {nexusSDK?.utils?.formatTokenBalance(token.balance, {
                          symbol: token.symbol,
                          decimals: token.decimals,
                        })}
                      </p>
                      <p className="text-xs text-white/60">${token.balanceInFiat.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 px-4 pb-3">
                  {positiveBreakdown.map((chain, index) => (
                    <React.Fragment key={chain.chain.id}>
                      <div className="flex items-center justify-between px-1 py-1.5 rounded-md">
                        <div className="flex items-center gap-2">
                          <div className="relative size-5">
                            <img
                              src={chain?.chain?.logo}
                              alt={chain.chain.name}
                              sizes="100%"
                              className="rounded-full size-full ring-1 ring-white/10"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <span className="text-xs text-white/80">{chain.chain.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-white">
                            {nexusSDK?.utils?.formatTokenBalance(chain.balance, {
                              symbol: token.symbol,
                              decimals: token.decimals,
                            })}
                          </p>
                          <p className="text-[11px] text-white/60">${chain.balanceInFiat.toFixed(2)}</p>
                        </div>
                      </div>
                      {index < positiveBreakdown.length - 1 && <Separator className="my-1 opacity-10" />}
                    </React.Fragment>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};
UnifiedBalance.displayName = "UnifiedBalance";
export default memo(UnifiedBalance);
