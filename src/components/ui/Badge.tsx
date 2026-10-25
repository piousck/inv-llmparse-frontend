import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-sm font-semibold transition-colors';

  const variants = {
    default: 'bg-primary text-primary-foreground shadow-xs',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    success: 'bg-primary/15 text-primary border border-primary/30',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    destructive: 'bg-destructive/15 text-destructive border border-destructive/20',
    outline: 'border border-border text-foreground bg-transparent',
  };

  return <div data-slot="badge" className={cn(base, variants[variant], className)} {...props} />;
};
