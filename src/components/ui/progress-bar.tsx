import * as React from 'react';
import { cn } from '@/lib/utils';

type NativeDivProps = React.ComponentPropsWithoutRef<"div">

interface ProgressBarProps extends Omit<NativeDivProps, "role" | "aria-valuemin" | "aria-valuemax" | "aria-valuenow" | "aria-busy"> {
  value?: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  indeterminate?: boolean;
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({
    value,
    className,
    showLabel = false,
    size = 'md',
    variant = 'default',
    indeterminate = false,
    children,
    ...props
  }, ref) => {
    const clampedValue = value !== undefined ? Math.min(100, Math.max(0, value)) : 0;

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    };

    const variantClasses = {
      default: 'bg-primary',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500'
    };

    return (
      <div
        ref={ref}
        {...props}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-busy={indeterminate ? "true" : undefined}
        className={cn("w-full", className)}
      >
        <div className={cn("w-full bg-muted rounded-full overflow-hidden", sizeClasses[size])}>
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              variantClasses[variant],
              indeterminate && "animate-pulse"
            )}
            style={{ width: indeterminate ? "100%" : `${clampedValue}%` }}
          />
        </div>
        {showLabel && !indeterminate && (
          <div className="text-sm text-muted-foreground mt-1 text-center">
            {Math.round(clampedValue)}%
          </div>
        )}
        {children}
      </div>
    );
  }
)

ProgressBar.displayName = 'ProgressBar'