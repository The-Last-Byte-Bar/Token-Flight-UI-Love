
import { cn } from '@/lib/utils';

interface ProgressStepsProps {
  currentStep: number;
  steps: { id: number; label: string }[];
}

const ProgressSteps = ({ currentStep, steps }: ProgressStepsProps) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress bar */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-deepsea-medium transform -translate-y-1/2 z-0" />
        
        <div className="absolute top-1/2 left-0 h-1 bg-deepsea-bright transform -translate-y-1/2 z-0 transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        
        {/* Steps */}
        {steps.map((step) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center">
            <div 
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-none",
                "transition-all duration-300 pixel-border",
                step.id <= currentStep 
                  ? "bg-deepsea-bright text-deepsea-dark border-white" 
                  : "bg-deepsea-medium text-deepsea-bright border-deepsea-bright"
              )}
            >
              {step.id}
            </div>
            <div className="mt-2 text-center text-xs font-bold">
              {step.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressSteps;
