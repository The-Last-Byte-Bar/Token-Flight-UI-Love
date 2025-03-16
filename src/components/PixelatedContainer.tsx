import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PixelatedContainerProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const PixelatedContainer = ({ children, className, onClick }: PixelatedContainerProps) => {
  return (
    <div 
      className={cn("pixel-card relative overflow-hidden", className)}
      onClick={onClick}
    >
      {/* Animated bubbles in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="bubble"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `-${Math.random() * 20}px`,
              opacity: 0.3 + Math.random() * 0.5,
              width: `${8 + Math.random() * 16}px`,
              height: `${8 + Math.random() * 16}px`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
              '--bubble-angle': `${Math.random() * 360}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>
      
      {children}
    </div>
  );
};

export default PixelatedContainer;
