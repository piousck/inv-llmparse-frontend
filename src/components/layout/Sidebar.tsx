import React from 'react';
import {
  Inbox,
  LayoutDashboard,
  CreditCard,
  Landmark,
  Building2,
  BookOpen,
  Percent,
  Users,
  BarChart3,
  Settings,
  PlusCircle,
  FileText,
  HelpCircle,
  MoreVertical,
  LogOut,
  LogIn,
  Scale,
  Layers,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { User } from '../../types/api';

export type NavTab =
  | 'invoices'
  | 'dashboard'
  | 'sales'
  | 'bank'
  | 'financials'
  | 'suppliers'
  | 'coa'
  | 'vat'
  | 'users'
  | 'reports'
  | 'settings';

export type FinancialSubTab = 'trial-balance' | 'formatted-tb' | 'pnl';

interface SidebarProps {
  isOpen?: boolean;
  onCloseMobile?: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeFinancialSubTab?: FinancialSubTab;
  onSelectFinancialSubTab?: (subTab: FinancialSubTab) => void;
  onOpenUpload?: (initialType?: 'invoice' | 'bank_statement') => void;
  currentUser?: User | null;
  mode: 'mock' | 'live';
  onLogout?: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onCloseMobile,
  currentTab,
  onSelectTab,
  activeFinancialSubTab = 'trial-balance',
  onSelectFinancialSubTab,
  onOpenUpload,
  currentUser,
  mode,
  onLogout,
  onOpenAuth,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isFinancialsOpen, setIsFinancialsOpen] = React.useState(true);

  const mainNav = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices' as NavTab, label: 'Lifecycle (Purchases)', icon: Inbox, badge: 'Core' },
    { id: 'reports' as NavTab, label: 'Analytics', icon: BarChart3 },
    { id: 'sales' as NavTab, label: 'Sales & Revenue', icon: CreditCard },
    { id: 'bank' as NavTab, label: 'Bank Statements', icon: Landmark },
    {
      id: 'financials' as NavTab,
      label: 'Financial statements',
      icon: Scale,
      subItems: [
        { id: 'trial-balance' as FinancialSubTab, label: 'Trial Balance', icon: Scale },
        { id: 'formatted-tb' as FinancialSubTab, label: 'Formatted Trial Balance', icon: Layers },
        { id: 'pnl' as FinancialSubTab, label: 'Profit & Loss', icon: TrendingUp },
      ],
    },
    { id: 'suppliers' as NavTab, label: 'Suppliers Master', icon: Building2 },
    { id: 'coa' as NavTab, label: 'Chart of Accounts (GL)', icon: BookOpen },
    { id: 'users' as NavTab, label: 'Team & Roles', icon: Users },
  ];

  const documentNav = [
    { id: 'coa' as NavTab, label: 'Chart of Accounts', icon: BookOpen },
    { id: 'vat' as NavTab, label: 'Irish VAT (Sec 60)', icon: Percent },
    { id: 'invoices' as NavTab, label: 'Active Proposals', icon: FileText },
  ];

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col shrink-0 select-none transition-all duration-300 ease-in-out z-40 border-r",
        // Desktop styles (md and up)
        "md:static md:min-h-screen md:translate-x-0 md:shadow-none",
        isOpen ? "md:w-64" : "md:w-16",
        // Mobile styles (< md) - off-canvas drawer
        "fixed inset-y-0 left-0 w-64 shadow-2xl md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none md:pointer-events-auto"
      )}
      aria-label="Sidebar Navigation"
    >
      {/* Team / Organization Brand Header */}
      <div
        className={cn(
          "h-12 flex items-center border-b border-sidebar-border transition-all",
          isOpen ? "px-4 justify-between gap-2" : "px-2 justify-center"
        )}
      >
        {isOpen ? (
          <>
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group flex-1"
            >
              <div className="w-6 h-6 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                ▲
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm tracking-tight text-foreground block truncate leading-tight group-hover:text-primary transition-colors">
                  Acme Accounting
                </span>
                <span className="text-[11px] text-muted-foreground block truncate">
                  Enterprise Hub · {mode === 'mock' ? 'Mock' : 'Live'}
                </span>
              </div>
            </button>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                aria-label="Close Sidebar"
              >
                <X className="size-4" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => onSelectTab('dashboard')}
            className="w-8 h-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-black text-xs shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
            title="Dashboard"
            aria-label="Dashboard"
          >
            ▲
          </button>
        )}
      </div>

      {/* Main Navigation Content */}
      <div className={cn("flex-1 py-3 flex flex-col gap-4 overflow-y-auto overflow-x-hidden", isOpen ? "px-3" : "px-2 items-center")}>
        {/* Quick Create Button */}
        {onOpenUpload && (
          isOpen ? (
            <button
              onClick={() => {
                if (!currentUser && onOpenAuth) {
                  onOpenAuth('login');
                } else {
                  onOpenUpload(currentTab === 'bank' ? 'bank_statement' : 'invoice');
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-xs hover:bg-primary/90 active:bg-primary/90 transition-all cursor-pointer"
            >
              <PlusCircle className="size-4 shrink-0" />
              <span>Quick Ingest</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (!currentUser && onOpenAuth) {
                  onOpenAuth('login');
                } else {
                  onOpenUpload(currentTab === 'bank' ? 'bank_statement' : 'invoice');
                }
              }}
              className="size-10 flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/90 transition-all cursor-pointer shrink-0"
              title="Quick Ingest"
              aria-label="Quick Ingest"
            >
              <PlusCircle className="size-5" />
            </button>
          )
        )}

        {/* Platform Section */}
        <div className={cn("flex flex-col gap-1 w-full", !isOpen && "items-center")}>
          {isOpen ? (
            <span className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
              Platform
            </span>
          ) : (
            <div className="w-8 h-px bg-sidebar-border/60 my-0.5" />
          )}

          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const hasSubItems = 'subItems' in item && Boolean(item.subItems);

            if (!isOpen) {
              return (
                <button
                  key={item.id + item.label}
                  onClick={() => {
                    if (!currentUser && onOpenAuth) {
                      onOpenAuth('login');
                      return;
                    }
                    onSelectTab(item.id);
                    if (item.id === 'financials' && onSelectFinancialSubTab && !activeFinancialSubTab) {
                      onSelectFinancialSubTab('trial-balance');
                    }
                  }}
                  className={cn(
                    "size-10 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                    isActive
                      ? "bg-sidebar-accent text-primary shadow-2xs font-semibold ring-1 ring-primary/25"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon className={cn("size-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                </button>
              );
            }

            return (
              <div key={item.id + item.label} className="flex flex-col">
                <button
                  onClick={() => {
                    if (!currentUser && onOpenAuth) {
                      onOpenAuth('login');
                      return;
                    }
                    if (item.id === 'financials') {
                      setIsFinancialsOpen(!isFinancialsOpen);
                      onSelectTab('financials');
                      if (onSelectFinancialSubTab && !activeFinancialSubTab) {
                        onSelectFinancialSubTab('trial-balance');
                      }
                    } else {
                      onSelectTab(item.id);
                    }
                  }}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-medium transition-all text-left w-full cursor-pointer',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn('size-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {'badge' in item && item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/15 text-primary font-bold">
                        {item.badge}
                      </span>
                    )}
                    {hasSubItems && (
                      <span className="text-muted-foreground">
                        {isFinancialsOpen ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </button>

                {/* Sub-items for Financial statements */}
                {hasSubItems && isFinancialsOpen && (
                  <div className="ml-5 pl-2 border-l border-sidebar-border/70 flex flex-col gap-0.5 mt-0.5 mb-1">
                    {item.subItems?.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = isActive && activeFinancialSubTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!currentUser && onOpenAuth) {
                              onOpenAuth('login');
                              return;
                            }
                            onSelectTab('financials');
                            onSelectFinancialSubTab?.(sub.id);
                          }}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-left w-full cursor-pointer',
                            isSubActive
                              ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                              : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                          )}
                        >
                          <SubIcon
                            className={cn(
                              'size-3.5 shrink-0',
                              isSubActive ? 'text-primary' : 'text-muted-foreground'
                            )}
                          />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Documents Section */}
        <div className={cn("flex flex-col gap-1 w-full", !isOpen && "items-center")}>
          {isOpen ? (
            <span className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
              Documents
            </span>
          ) : (
            <div className="w-8 h-px bg-sidebar-border/60 my-0.5" />
          )}
          {documentNav.map((item, idx) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            if (!isOpen) {
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!currentUser && onOpenAuth) {
                      onOpenAuth('login');
                    } else {
                      onSelectTab(item.id);
                    }
                  }}
                  className={cn(
                    "size-10 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                    isActive
                      ? "bg-sidebar-accent text-primary shadow-2xs font-semibold ring-1 ring-primary/25"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon className={cn("size-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                </button>
              );
            }

            return (
              <button
                key={idx}
                onClick={() => {
                  if (!currentUser && onOpenAuth) {
                    onOpenAuth('login');
                  } else {
                    onSelectTab(item.id);
                  }
                }}
                className={cn(
                  'flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-medium transition-all text-left w-full cursor-pointer',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={cn('size-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Secondary Navigation */}
        <div className={cn("flex flex-col gap-1 mt-auto pt-2 border-t border-sidebar-border w-full", !isOpen && "items-center")}>
          {isOpen ? (
            <>
              <button
                onClick={() => {
                  if (!currentUser && onOpenAuth) {
                    onOpenAuth('login');
                  } else {
                    onSelectTab('settings');
                  }
                }}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all text-left w-full cursor-pointer',
                  currentTab === 'settings'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Settings className="size-4 text-muted-foreground shrink-0" />
                <span>Settings</span>
              </button>

              <a
                href="https://tweakcn.com/editor/theme?p=dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
              >
                <HelpCircle className="size-4 text-muted-foreground shrink-0" />
                <span>Get Help</span>
              </a>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  if (!currentUser && onOpenAuth) {
                    onOpenAuth('login');
                  } else {
                    onSelectTab('settings');
                  }
                }}
                className={cn(
                  "size-10 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                  currentTab === 'settings'
                    ? "bg-sidebar-accent text-primary shadow-2xs font-semibold ring-1 ring-primary/25"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="size-5 text-muted-foreground shrink-0" />
              </button>
              <a
                href="https://tweakcn.com/editor/theme?p=dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="size-10 rounded-lg flex items-center justify-center text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all shrink-0"
                title="Get Help"
                aria-label="Get Help"
              >
                <HelpCircle className="size-5 text-muted-foreground shrink-0" />
              </a>
            </>
          )}
        </div>
      </div>

      {/* NavUser Footer (tweakcn nav-user style) */}
      <div className={cn("border-t border-sidebar-border bg-sidebar relative", isOpen ? "p-2" : "p-2 flex justify-center")}>
        {currentUser ? (
          <div>
            {isOpen ? (
              <div
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-sidebar-accent/60 transition-colors cursor-pointer select-none"
              >
                <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                  {currentUser.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-medium text-foreground">
                    {currentUser.display_name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {currentUser.email}
                  </span>
                </div>
                <MoreVertical className="size-4 text-muted-foreground shrink-0" />
              </div>
            ) : (
              <div
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="size-10 rounded-lg hover:bg-sidebar-accent/60 flex items-center justify-center cursor-pointer transition-colors"
                title={`${currentUser.display_name} (${currentUser.email})`}
                aria-label="User profile"
              >
                <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                  {currentUser.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
            )}

            {isUserMenuOpen && (
              <div
                className={cn(
                  "absolute bottom-full mb-1.5 rounded-lg bg-card border border-border shadow-lg p-1.5 z-50 text-sm animate-in fade-in zoom-in-95 duration-100",
                  isOpen ? "left-2 right-2" : "left-2 w-56"
                )}
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="px-2 py-1.5 border-b border-border">
                  <p className="font-semibold text-foreground text-sm">{currentUser.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                    Role: {currentUser.role}
                  </span>
                </div>
                {onLogout && (
                  <div className="py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <LogOut className="size-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={cn("flex items-center gap-2", isOpen ? "p-1.5 justify-between" : "p-1 justify-center")}>
            {isOpen ? (
              <>
                <div className="grid leading-tight min-w-0">
                  <span className="text-xs font-semibold text-foreground">Guest Access</span>
                  <span className="text-[11px] text-muted-foreground">Not signed in</span>
                </div>
                {onOpenAuth && (
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="py-1 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <LogIn className="size-3.5" />
                    Sign In
                  </button>
                )}
              </>
            ) : (
              onOpenAuth && (
                <button
                  onClick={() => onOpenAuth('login')}
                  className="size-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
                  title="Sign In"
                  aria-label="Sign In"
                >
                  <LogIn className="size-4" />
                </button>
              )
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
