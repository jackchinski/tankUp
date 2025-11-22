import React from "react";
import { clsx } from "clsx";

interface StepperProps {
  currentStep: number;
}

const steps = [
  { number: 1, label: "Configuration" },
  { number: 2, label: "Dispersion" },
];

const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col gap-2">
        <div className="text-sm text-secondary font-medium">
          Step {currentStep}/{steps.length}
        </div>
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(41,151,255,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Stepper;
