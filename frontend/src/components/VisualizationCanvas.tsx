import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGasFountain } from "../context/GasFountainContext";
import { chains, getNumericChainId } from "../data/chains";
import { ChainDispersal, ChainDispersalStatus } from "../types";
// TODO: Switch to useIntentStatus when backend is ready
import { useMockIntentStatus } from "../hooks/useMockIntentStatus";
// import { useIntentStatus } from "../hooks/useIntentStatus";

interface VisualizationCanvasProps {
  isDispersing: boolean;
  isCompleted: boolean;
  intentId?: string; // Optional intent ID to fetch status from backend
}

interface Position {
  x: number;
  y: number;
}

interface Dimensions {
  width: number;
  height: number;
}

interface ChainWithStatus {
  chain: (typeof chains)[0];
  status: ChainDispersalStatus;
  amountUsd: string;
  txHash?: string;
  explorerUrl?: string;
}

const VisualizationCanvas: React.FC<VisualizationCanvasProps> = ({
  isDispersing,
  isCompleted,
  intentId,
}) => {
  const { sourceChain, selectedChains, transactionCounts } = useGasFountain();
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });
  const [chainsWithStatus, setChainsWithStatus] = useState<ChainWithStatus[]>(
    []
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Use mock hook for now - switch to useIntentStatus when backend is ready
  const { data: intentData } = useMockIntentStatus({
    intentId: intentId && isDispersing ? intentId : undefined,
    selectedChains,
    transactionCounts,
    enabled: !!intentId && isDispersing,
    pollInterval: 3000,
  });

  // Map intent data to chains with status
  useEffect(() => {
    if (!intentId || !intentData) {
      // If no intentId or data, use selectedChains from context
      const mapped: ChainWithStatus[] = selectedChains.map((chain) => ({
        chain,
        status: "NOT_STARTED" as ChainDispersalStatus,
        amountUsd: (
          (transactionCounts?.[chain.id] || 10) * chain.avgTxCost
        ).toFixed(2),
      }));
      setChainsWithStatus(mapped);
      return;
    }

    // Map chainStatuses to chains data, preserving the original order of selectedChains
    // Create a map of chainId -> chainStatus for quick lookup
    const statusMap = new Map<number, ChainDispersal>();
    intentData.intent.chainStatuses.forEach((chainStatus: ChainDispersal) => {
      statusMap.set(chainStatus.chainId, chainStatus);
    });

    // Map selectedChains in their original order, matching with statuses
    const mapped: ChainWithStatus[] = selectedChains
      .map((chain) => {
        const numericChainId = getNumericChainId(chain.id);
        if (!numericChainId) return null;

        const chainStatus = statusMap.get(numericChainId);
        if (!chainStatus) {
          // If no status found, use default
          return {
            chain,
            status: "NOT_STARTED" as ChainDispersalStatus,
            amountUsd: (
              (transactionCounts?.[chain.id] || 10) * chain.avgTxCost
            ).toFixed(2),
          };
        }

        return {
          chain,
          status: chainStatus.status,
          amountUsd: chainStatus.amountUsd,
          txHash: chainStatus.txHash,
          explorerUrl: chainStatus.explorerUrl,
        };
      })
      .filter((item): item is ChainWithStatus => item !== null);

    setChainsWithStatus(mapped);
  }, [intentData, intentId, selectedChains, transactionCounts]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = (): void => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Fixed spacing between destination nodes (in pixels)
  const FIXED_NODE_SPACING = 120;
  const TOP_PADDING = 50;
  const SIDE_PADDING = 80;

  // Calculate minimum content height needed for all nodes
  const minContentHeight =
    chainsWithStatus.length > 0
      ? TOP_PADDING + FIXED_NODE_SPACING * (chainsWithStatus.length - 1) + 100
      : dimensions.height || 400;

  // Calculate positions
  // Source node positioned at middle of content area (consistent regardless of viewport)
  const sourcePos: Position = {
    x: SIDE_PADDING,
    y: minContentHeight / 2,
  };

  const getDestPos = (index: number, total: number): Position => {
    // Use fixed spacing - nodes will be evenly spaced regardless of count
    const startY = TOP_PADDING;
    const y = startY + FIXED_NODE_SPACING * index;

    return {
      x: dimensions.width > 0 ? dimensions.width - SIDE_PADDING : 400,
      y: total === 1 ? sourcePos.y : y, // If only one chain, center it with source
    };
  };

  // Generate SVG Path for Bezier Curve (Horizontal)
  const getPath = (start: Position, end: Position): string => {
    const controlPoint1 = { x: start.x + (end.x - start.x) / 2, y: start.y };
    const controlPoint2 = { x: end.x - (end.x - start.x) / 2, y: end.y };
    return `M ${start.x} ${start.y} C ${controlPoint1.x} ${controlPoint1.y} ${controlPoint2.x} ${controlPoint2.y} ${end.x} ${end.y}`;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] relative overflow-auto isolate bg-transparent"
      style={{
        minHeight: `${Math.min(minContentHeight, 800)}px`,
        maxHeight: "800px",
        contain: "layout style paint",
      }}
    >
      {/* SVG Layer - extends to cover all nodes */}
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: "100%",
          height: `${minContentHeight}px`,
          minHeight: `${minContentHeight}px`,
        }}
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(41, 151, 255, 0.5)" />
            <stop offset="100%" stopColor="rgba(41, 151, 255, 0.1)" />
          </linearGradient>
        </defs>

        {chainsWithStatus.map((item, index) => {
          const dest = getDestPos(index, chainsWithStatus.length);
          const path = getPath(sourcePos, dest);
          const isConfirmed = item.status === "CONFIRMED";
          const isFailed = item.status === "FAILED";
          const shouldAnimate = isDispersing && !isCompleted && !isConfirmed;

          return (
            <g key={item.chain.id}>
              {/* Base Line */}
              <path
                d={path}
                fill="none"
                stroke={
                  isConfirmed
                    ? "rgba(34, 197, 94, 0.5)"
                    : isFailed
                    ? "rgba(239, 68, 68, 0.5)"
                    : "url(#lineGradient)"
                }
                strokeWidth="2"
                strokeLinecap="round"
                className={isConfirmed ? "opacity-60" : "opacity-30"}
              />

              {/* Animated Particle */}
              <AnimatePresence>
                {shouldAnimate && (
                  <motion.circle r="3" fill="#fff" filter="url(#glow)">
                    <animateMotion
                      dur={`${1.5 + Math.random()}s`}
                      repeatCount="indefinite"
                      path={path}
                      keyPoints="0;1"
                      keyTimes="0;1"
                      calcMode="linear"
                    />
                  </motion.circle>
                )}
              </AnimatePresence>
            </g>
          );
        })}

        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>

      {/* Source Node */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
        style={{
          left: `${sourcePos.x}px`,
          top: `${sourcePos.y}px`,
        }}
      >
        <motion.div
          className="w-20 h-20 rounded-full bg-white/5 border-4 border-primary flex items-center justify-center shadow-[0_0_30px_rgba(41,151,255,0.3)] backdrop-blur-md"
          animate={
            isDispersing
              ? {
                  scale: [1, 1.05, 1],
                  boxShadow: "0 0 50px rgba(41,151,255,0.6)",
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          <img
            src={sourceChain?.logo}
            alt="Source"
            className="w-10 h-10 rounded-full"
          />
        </motion.div>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-sm text-center">
          {sourceChain?.name}
        </div>
      </div>

      {/* Destination Nodes */}
      {chainsWithStatus.map((item, index) => {
        const pos = getDestPos(index, chainsWithStatus.length);
        const isConfirmed = item.status === "CONFIRMED";
        const isBroadcasted = item.status === "BROADCASTED";
        const isQueued = item.status === "QUEUED";
        const isFailed = item.status === "FAILED";
        const isInProgress = isBroadcasted || isQueued;

        // Determine border color and styling based on status
        let borderClass = "border-white/20";
        let shadowClass = "";
        if (isConfirmed) {
          borderClass = "border-green-500";
          shadowClass = "shadow-[0_0_20px_rgba(34,197,94,0.4)]";
        } else if (isFailed) {
          borderClass = "border-red-500";
          shadowClass = "shadow-[0_0_20px_rgba(239,68,68,0.4)]";
        } else if (isBroadcasted) {
          borderClass = "border-blue-400";
          shadowClass = "shadow-[0_0_15px_rgba(96,165,250,0.3)]";
        } else if (isQueued) {
          borderClass = "border-yellow-400";
          shadowClass = "shadow-[0_0_15px_rgba(250,204,21,0.3)]";
        }

        return (
          <div
            key={item.chain.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/4 z-10"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
            }}
          >
            <motion.div
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-white/5 backdrop-blur-md transition-colors duration-500 ${borderClass} ${shadowClass}`}
              animate={
                isConfirmed
                  ? { scale: [1, 1.1, 1] }
                  : isInProgress
                  ? { scale: [1, 1.05, 1] }
                  : {}
              }
              transition={
                isConfirmed || isInProgress
                  ? { duration: 2, repeat: Infinity }
                  : {}
              }
            >
              <img
                src={item.chain.logo}
                alt={item.chain.name}
                className="w-6 h-6 rounded-full"
              />
              {isConfirmed && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px]"
                >
                  ✓
                </motion.div>
              )}
              {isFailed && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px]"
                >
                  ✕
                </motion.div>
              )}
              {isInProgress && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -right-1 -top-1 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
                />
              )}
            </motion.div>

            <div className="text-[10px] text-secondary text-center">
              ${item.amountUsd}
            </div>
            {item.status !== "NOT_STARTED" && (
              <div className="text-[9px] text-secondary/70 text-center mt-0.5 capitalize">
                {item.status.toLowerCase().replace("_", " ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VisualizationCanvas;
