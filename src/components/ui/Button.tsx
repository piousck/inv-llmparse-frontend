import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

    const variants = {
      primary: 'bg-primary text-primary-foreground hover:opacity-90 shadow-xs border border-transparent font-semibold',
      secondary: 'bg-card text-foreground hover:bg-muted border border-border shadow-2xs font-medium',
      outline: 'border border-border bg-transparent hover:bg-muted text-foreground font-medium',
      ghost: 'hover:bg-muted text-muted-foreground hover:text-foreground font-medium',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs border border-transparent font-semibold',
      danger: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-xs border border-transparent font-semibold',
      warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs border border-transparent font-semibold',
    };

    const sizes = {
      sm: 'px-2.5 py-1 text-xs gap-1.5 h-8',
      md: 'px-3.5 py-1.5 text-sm gap-2 h-9',
      lg: 'px-4 py-2 text-sm gap-2.5 h-10',
      icon: 'size-8 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
