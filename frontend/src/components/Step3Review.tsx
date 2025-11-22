import React, { useState } from 'react';
import { useGasFountain } from '../context/GasFountainContext';
import VisualizationCanvas from './VisualizationCanvas';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';

type Status = 'idle' | 'dispersing' | 'success' | 'error';

const Step3Review: React.FC = () => {
    const {
        setCurrentStep,
        selectedChains,
        sourceChain,
        sourceToken,
        depositAmount,
        setHistory,
        transactionCounts
    } = useGasFountain();

    const [status, setStatus] = useState<Status>('idle'); // idle, dispersing, success, error
    const [progressStep, setProgressStep] = useState<number>(0); // 0: Idle, 1: Swapping, 2: Bridging, 3: Dispersing

    const handleBack = (): void => setCurrentStep(2);

    const handleDisperse = (): void => {
        setStatus('dispersing');
        setProgressStep(1);

        // Mock sequence
        setTimeout(() => setProgressStep(2), 2000);
        setTimeout(() => setProgressStep(3), 4000);
        setTimeout(() => {
            setStatus('success');
            // Add to history
            setHistory(prev => [{
                id: Date.now(),
                timestamp: Date.now(),
                amount: depositAmount,
                chains: selectedChains.length,
                status: 'Success'
            }, ...prev]);
        }, 6000);
    };

    const estimatedFees = 1.50; // Mock

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Left Column: Review Summary */}
            <div className="glass-card rounded-2xl p-6 flex flex-col h-auto lg:h-[600px]">
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-2">Review Dispersion</h2>
                    <p className="text-secondary text-sm">Confirm details before sending.</p>
                </div>

                {status === 'success' ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                            <Check className="w-10 h-10 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Dispersion Complete!</h3>
                        <p className="text-secondary mb-8">
                            You successfully dispersed ${depositAmount} to {selectedChains.length} chains.
                        </p>
                        <button
                            onClick={() => setCurrentStep(1)}
                            className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                        >
                            Start New Dispersion
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                            {/* Source Info */}
                            <div className="bg-background/30 p-4 rounded-xl border border-border backdrop-blur-sm">
                                <div className="text-xs text-secondary uppercase tracking-wider mb-2">Source</div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <img src={sourceChain?.logo} alt="Source" className="w-6 h-6 rounded-full" />
                                        <span className="font-medium">{sourceChain?.name}</span>
                                    </div>
                                    <div className="font-bold">
                                        {depositAmount.toFixed(2)} USD ({sourceToken?.symbol})
                                    </div>
                                </div>
                            </div>

                            {/* Destinations Table */}
                            <div className="bg-background/30 rounded-xl border border-border overflow-hidden backdrop-blur-sm">
                                <div className="p-3 bg-white/5 border-b border-border text-xs font-semibold text-secondary flex">
                                    <div className="flex-1">Chain</div>
                                    <div className="w-24 text-right">Allocation</div>
                                    <div className="w-24 text-right">Est. Native</div>
                                </div>
                                <div className="divide-y divide-border">
                                    {selectedChains.map(chain => (
                                        <div key={chain.id} className="p-3 flex items-center text-sm">
                                            <div className="flex-1 flex items-center gap-2">
                                                <img src={chain.logo} alt={chain.name} className="w-5 h-5 rounded-full" />
                                                <span>{chain.name}</span>
                                            </div>
                                            <div className="w-24 text-right font-medium">
                                                ${((transactionCounts[chain.id] || 10) * chain.avgTxCost).toFixed(2)}
                                            </div>
                                            <div className="w-24 text-right text-secondary">
                                                ~{(((transactionCounts[chain.id] || 10) * chain.avgTxCost) / chain.nativePrice).toFixed(4)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-secondary">Total Deposit</span>
                                    <span className="font-medium">${depositAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-secondary">Est. Network Fees</span>
                                    <span className="font-medium">~${estimatedFees.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                                    <span>Total Cost</span>
                                    <span>${(depositAmount + estimatedFees).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-border flex gap-4">
                            <button
                                onClick={handleBack}
                                disabled={status === 'dispersing'}
                                className="flex-1 py-3 bg-muted text-secondary rounded-xl font-bold hover:bg-border transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                Back
                            </button>
                            <button
                                onClick={handleDisperse}
                                disabled={status === 'dispersing'}
                                className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                {status === 'dispersing' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {progressStep === 1 ? 'Swapping...' : progressStep === 2 ? 'Bridging...' : 'Dispersing...'}
                                    </>
                                ) : (
                                    'Disperse Gas'
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Right Column: Visualization */}
            <div className="h-[400px] lg:h-[600px]">
                <VisualizationCanvas
                    isDispersing={status === 'dispersing'}
                    isCompleted={status === 'success'}
                />
            </div>
        </div>
    );
};

export default Step3Review;

