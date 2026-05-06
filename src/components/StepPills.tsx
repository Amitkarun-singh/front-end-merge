import { Check } from 'lucide-react';

interface Step {
  label: string;
  shortLabel?: string;
}

interface StepPillsProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export default function StepPills({ steps, currentStep }: StepPillsProps) {
  return (
    <div className="step-pills" role="list" aria-label="Progress steps">
      {steps.map((step, idx) => {
        const isDone = idx < currentStep;
        const isActive = idx === currentStep;
        const statusClass = isDone ? 'step-pill-done' : isActive ? 'step-pill-active' : 'step-pill-upcoming';

        return (
          <div key={idx} className="step-pill-item" role="listitem">
            <div className={`step-pill ${statusClass}`} aria-current={isActive ? 'step' : undefined}>
              {isDone ? (
                <>
                  <Check size={11} strokeWidth={3} className="step-pill-check" />
                  <span className="step-pill-label">{step.label}</span>
                  <span className="step-pill-short">{idx + 1}</span>
                </>
              ) : (
                <>
                  <span className="step-pill-num">{idx + 1}</span>
                  <span className="step-pill-label">{step.label}</span>
                  <span className="step-pill-short">{step.shortLabel ?? idx + 1}</span>
                </>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className={`step-pill-connector ${isDone ? 'step-pill-connector-done' : ''}`} aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
}
