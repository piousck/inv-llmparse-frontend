import React, { useState } from 'react';
import { Lock, LogIn, UserPlus, Shield, Sparkles, Globe } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface SignedOutViewProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onQuickLogin: (email: string) => Promise<void>;
  mode: 'mock' | 'live';
  onToggleMode: () => void;
}

export const SignedOutView: React.FC<SignedOutViewProps> = ({
  onOpenLogin,
  onOpenRegister,
  onQuickLogin,
  mode,
  onToggleMode,
}) => {
  const [loggingInEmail, setLoggingInEmail] = useState<string | null>(null);

  const demoAccounts = [
    {
      email: mode === 'live' ? 'admin@apexpractice.ie' : 'sarah@apexpractice.ie',
      name: mode === 'live' ? 'Practice Admin' : 'Sarah Jenkins',
      role: 'Admin / Senior Accountant',
      badge: 'Full Access',
      badgeVariant: 'default' as const,
      desc: 'Complete access to all client organizations, GL review, and system configurations.',
    },
    {
      email: 'ckpious@gmail.com',
      name: 'Beach Fuels Ltd (Pious Chacko)',
      role: 'Client Admin (Beach Fuels)',
      badge: 'Beach Fuels',
      badgeVariant: 'secondary' as const,
      desc: 'Direct access to Beach Fuels Ltd invoices, suppliers, and GL accounts.',
    },
    {
      email: 'sarah@apexpractice.ie',
      name: 'Sarah Jenkins',
      role: 'Staff Accountant (Standard)',
      badge: 'Standard Staff',
      badgeVariant: 'secondary' as const,
      desc: 'Invoice processing, GL code assignments, and audit logging.',
    },
    {
      email: 'restricted@apexpractice.ie',
      name: 'Client Uploader',
      role: 'Restricted Staff',
      badge: 'Uploader Only',
      badgeVariant: 'warning' as const,
      desc: 'Scoped view restricted exclusively to invoices uploaded by this user.',
    },
  ];

  const handleDemoClick = async (email: string) => {
    setLoggingInEmail(email);
    try {
      await onQuickLogin(email);
    } finally {
      setLoggingInEmail(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-background min-h-[calc(100vh-3.5rem)] select-none">
      <div className="w-full max-w-xl flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Security Shield Badge */}
        <div className="relative">
          <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
            <Lock className="size-8 stroke-[2.2]" />
          </div>
          <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Shield className="size-3.5" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted border border-border text-muted-foreground mb-1">
            <span>Session Inactive</span>
            <span>•</span>
            <span className="capitalize">{mode} Mode</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            You are Signed Out
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Financial documents, extracted invoice line-items, and client accounting records are protected.
            Sign in to access your organization workspace.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-xs">
          <Button
            variant="primary"
            size="md"
            onClick={onOpenLogin}
            className="w-full gap-2 text-sm font-bold shadow-md shadow-primary/15"
          >
            <LogIn className="size-4" />
            Sign In to Account
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={onOpenRegister}
            className="w-full gap-2 text-sm font-medium"
          >
            <UserPlus className="size-4" />
            Create New Account
          </Button>
        </div>

        {/* Quick Demo Logins */}
        <div className="w-full pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="size-3 text-primary" />
              Quick Demo Access
            </span>
            <span className="text-muted-foreground text-[11px]">One-click sign in</span>
          </div>

          <div className="grid gap-2 text-left">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                onClick={() => handleDemoClick(account.email)}
                disabled={loggingInEmail !== null}
                className="group relative flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/60 hover:border-primary/40 transition-all cursor-pointer text-xs disabled:opacity-50 text-left"
              >
                <div className="space-y-0.5 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                      {account.name}
                    </span>
                    <Badge variant={account.badgeVariant} className="text-[10px] px-1.5 py-0 h-4 font-bold">
                      {account.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{account.desc}</p>
                </div>
                <div className="shrink-0 flex items-center text-primary font-medium text-xs opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  {loggingInEmail === account.email ? (
                    <span className="text-xs">Signing in...</span>
                  ) : (
                    <span>Sign in →</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Execution Mode Toggle */}
        <div className="pt-2 text-center">
          <button
            onClick={onToggleMode}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Globe className="size-3.5 text-primary" />
            <span>Environment: <strong className="capitalize text-foreground">{mode} Mode</strong></span>
            <span className="underline ml-1">Switch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
