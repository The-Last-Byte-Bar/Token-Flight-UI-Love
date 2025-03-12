
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface PixelatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const PixelatedButton = forwardRef<HTMLButtonElement, PixelatedButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center font-bold uppercase tracking-wider transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deepsea-bright",
          "disabled:opacity-50 disabled:pointer-events-none",
          
          // Variant styles
          variant === 'primary' && "bg-deepsea-medium hover:bg-deepsea-light text-white pixel-border border-deepsea-bright",
          variant === 'secondary' && "bg-deepsea-light hover:bg-deepsea-bright text-white pixel-border",
          variant === 'outline' && "bg-transparent border-2 border-deepsea-light hover:bg-deepsea-medium/20 text-deepsea-bright",
          variant === 'destructive' && "bg-red-700 hover:bg-red-800 text-white pixel-border border-red-500",
          
          // Size styles
          size === 'sm' && "text-xs px-2 py-1",
          size === 'md' && "text-sm px-4 py-2",
          size === 'lg' && "text-base px-6 py-3",
          
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PixelatedButton.displayName = 'PixelatedButton';

export default PixelatedButton;
