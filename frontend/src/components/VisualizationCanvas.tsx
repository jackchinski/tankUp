import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGasFountain } from '../context/GasFountainContext';

interface VisualizationCanvasProps {
    isDispersing: boolean;
    isCompleted: boolean;
}

interface Position {
    x: number;
    y: number;
}

const VisualizationCanvas: React.FC<VisualizationCanvasProps> = ({ isDispersing, isCompleted }) => {
    const { sourceChain, selectedChains, transactionCounts } = useGasFountain();
    const [dimensions, setDimensions] = useState<Position>({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = (): void => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Calculate positions
    const sourcePos: Position = { x: 80, y: dimensions.height / 2 };

    const getDestPos = (index: number, total: number): Position => {
        const availableHeight = dimensions.height - 100; // Padding
        const step = total > 1 ? availableHeight / (total - 1) : 0;
        const startY = 50; // Padding top
        return {
            x: dimensions.width - 80,
            y: total === 1 ? dimensions.height / 2 : startY + (step * index)
        };
    };

    // Generate SVG Path for Bezier Curve (Horizontal)
    const getPath = (start: Position, end: Position): string => {
        const controlPoint1 = { x: start.x + (end.x - start.x) / 2, y: start.y };
        const controlPoint2 = { x: end.x - (end.x - start.x) / 2, y: end.y };
        return `M ${start.x} ${start.y} C ${controlPoint1.x} ${controlPoint1.y} ${controlPoint2.x} ${controlPoint2.y} ${end.x} ${end.y}`;
    };

    return (
        <div ref={containerRef} className="w-full h-full min-h-[400px] glass-card rounded-2xl relative overflow-hidden">

            {/* SVG Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(41, 151, 255, 0.5)" />
                        <stop offset="100%" stopColor="rgba(41, 151, 255, 0.1)" />
                    </linearGradient>
                </defs>

                {selectedChains.map((chain, index) => {
                    const dest = getDestPos(index, selectedChains.length);
                    const path = getPath(sourcePos, dest);

                    return (
                        <g key={chain.id}>
                            {/* Base Line */}
                            <path
                                d={path}
                                fill="none"
                                stroke="url(#lineGradient)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                className="opacity-30"
                            />

                            {/* Animated Particle */}
                            <AnimatePresence>
                                {isDispersing && !isCompleted && (
                                    <motion.circle
                                        r="3"
                                        fill="#fff"
                                        filter="url(#glow)"
                                    >
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
                style={{ left: sourcePos.x, top: sourcePos.y }}
            >
                <motion.div
                    className="w-20 h-20 rounded-full bg-white/5 border-4 border-primary flex items-center justify-center shadow-[0_0_30px_rgba(41,151,255,0.3)] backdrop-blur-md"
                    animate={isDispersing ? { scale: [1, 1.05, 1], boxShadow: "0 0 50px rgba(41,151,255,0.6)" } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <img src={sourceChain?.logo} alt="Source" className="w-10 h-10 rounded-full" />
                </motion.div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-sm text-center">
                    {sourceChain?.name}
                </div>
            </div>

            {/* Destination Nodes */}
            {selectedChains.map((chain, index) => {
                const pos = getDestPos(index, selectedChains.length);
                return (
                    <div
                        key={chain.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ left: pos.x, top: pos.y }}
                    >
                        <motion.div
                            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-white/5 backdrop-blur-md transition-colors duration-500 ${isCompleted ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'border-white/20'
                                }`}
                            animate={isCompleted ? { scale: [1, 1.2, 1] } : {}}
                        >
                            <img src={chain.logo} alt={chain.name} className="w-6 h-6 rounded-full" />
                            {isCompleted && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -right-1 -top-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px]"
                                >
                                    ✓
                                </motion.div>
                            )}
                        </motion.div>
                        <div className="mt-2 text-xs text-center font-medium w-20 truncate">
                            {chain.name}
                        </div>
                        <div className="text-[10px] text-secondary text-center">
                            ${((transactionCounts?.[chain.id] || 10) * chain.avgTxCost).toFixed(2)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default VisualizationCanvas;

