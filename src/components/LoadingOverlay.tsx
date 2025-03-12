
import { Loader } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

const LoadingOverlay = ({ isLoading, message = 'Loading...' }: LoadingOverlayProps) => {
  if (!isLoading) return null;
  
  return (
    <div className="fixed inset-0 bg-deepsea-dark/70 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="pixel-card text-center flex flex-col items-center p-8">
        <Loader className="animate-spin h-10 w-10 text-deepsea-bright mb-4" />
        <div className="text-deepsea-bright font-bold">{message}</div>
        
        {/* Animated bubbles */}
        <div className="mt-6 relative w-full h-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 rounded-full bg-deepsea-bright animate-bubble-rise"
              style={{
                left: `${(i / 8) * 100}%`,
                width: '8px',
                height: '8px',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
