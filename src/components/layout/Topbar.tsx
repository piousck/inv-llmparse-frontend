import { useState } from 'react';
import {
  Building,
  ChevronDown,
  Moon,
  Sun,
  Upload,
  Database,
  Globe,
  PanelLeft,
  LogOut,
  LogIn,
  Plus,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Organization, User, Role } from '../../types/api';
import { cn } from '../../lib/utils';

interface TopbarProps {
  organizations: Organization[];
  activeOrgId: string;
  onSelectOrg: (orgId: string) => void;
  currentUser: User | null;
  onRoleChange?: (role: Role) => void;
  onLogout: () => void;
  onOpenUpload: (initialType?: 'invoice' | 'bank_statement') => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  mode: 'mock' | 'live';
  onToggleMode: () => void;
  breadcrumb?: string;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  currentTab?: string;
  activeInvoiceId?: string | null;
}

export function Topbar({
  organizations,
  activeOrgId,
  onSelectOrg,
  currentUser,
  onRoleChange,
  onLogout,
  onOpenUpload,
  onOpenAuth,
  mode,
  onToggleMode,
  breadcrumb = 'Dashboard',
  isSidebarOpen = true,
  onToggleSidebar,
  currentTab: _currentTab,
  activeInvoiceId,
}: TopbarProps) {
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const activeOrg = organizations.find((o) => o.id === activeOrgId) || organizations[0];

  const filteredOrgs = orgSearch.trim()
    ? organizations.filter(
        (o) =>
          o.name.toLowerCase().includes(orgSearch.trim().toLowerCase()) ||
          (o.industry && o.industry.toLowerCase().includes(orgSearch.trim().toLowerCase()))
      )
    : organizations;

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="h-12 shrink-0 border-b border-border bg-card/60 backdrop-blur-xs px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 transition-all w-full max-w-full">
      {/* Left: Sidebar trigger, separator, breadcrumb & Org */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 mr-2">
        {currentUser && (
          <>
            <button
              type="button"
              id="btn-toggle-sidebar"
              onClick={onToggleSidebar}
              className={cn(
                "size-8 -ml-1 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors shrink-0",
                !isSidebarOpen && "bg-muted/70 text-foreground ring-1 ring-border shadow-2xs"
              )}
              title={isSidebarOpen ? "Collapse Sidebar (⌘B)" : "Expand Sidebar (⌘B)"}
              aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <PanelLeft className="size-4" />
            </button>

            <div className="mx-0.5 sm:mx-1 h-4 w-px bg-border shrink-0" />
          </>
        )}

        <h1 className="text-xs sm:text-sm md:text-base font-semibold text-foreground tracking-tight truncate min-w-0 max-w-[150px] sm:max-w-[220px] shrink-0">
          {breadcrumb}
        </h1>

        {/* Org Switcher */}
        {currentUser && (
          <div className="relative ml-1 hidden sm:block shrink-0">
            <button
              id="workspace-switcher-btn"
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-all cursor-pointer"
            >
              <Building className="size-3.5 text-primary shrink-0" />
              <span className="truncate max-w-[90px] md:max-w-[130px] font-medium">{activeOrg?.name || 'Acme Inc.'}</span>
              {activeOrg?.industry && (
                <span className="hidden xl:inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 capitalize">
                  {activeOrg.industry.replace('_', ' ')}
                </span>
              )}
              <ChevronDown className="size-3 text-muted-foreground shrink-0" />
            </button>

            {isOrgDropdownOpen && (
              <div
                className="absolute left-0 mt-1.5 w-72 rounded-lg bg-card border border-border shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Select Workspace</span>
                  <span className="text-[10px] text-muted-foreground">{organizations.length}</span>
                </div>
                {organizations.length > 4 && (
                  <div className="px-1 py-1">
                    <input
                      type="text"
                      placeholder="Search workspace..."
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto space-y-0.5 mt-1">
                  {filteredOrgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        onSelectOrg(org.id);
                        setIsOrgDropdownOpen(false);
                        setOrgSearch('');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        org.id === activeOrgId
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-xs truncate">{org.name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal capitalize truncate">
                          {org.industry?.replace('_', ' ') || 'General'}
                        </div>
                      </div>
                      {org.id === activeOrgId && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  ))}
                  {filteredOrgs.length === 0 && (
                    <div className="px-2 py-3 text-xs text-center text-muted-foreground">
                      No matching workspaces found
                    </div>
                  )}
                </div>
                <div className="pt-1 mt-1 border-t border-border">
                  <button
                    onClick={() => {
                      setIsOrgDropdownOpen(false);
                      setOrgSearch('');
                      onOpenAuth('register');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-bold text-primary hover:bg-primary/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Create New Organization...</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Upload Button - only visible on main invoices list view, hidden on detail views */}
        {currentUser && !activeInvoiceId && (
          <Button variant="primary" size="sm" onClick={() => onOpenUpload()} className="gap-1.5 h-8 px-2.5 text-xs shrink-0">
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </Button>
        )}

        {/* Global Mode & Theme Toggles - hidden on detail review view to avoid competing with CTAs */}
        {!activeInvoiceId && (
          <>
            {/* Mode Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleMode}
              title={mode === 'mock' ? 'Click to switch to Live Backend' : 'Click to switch to Mock Store'}
              className="h-8 px-2 sm:px-2.5 text-xs gap-1.5 font-normal border-border shrink-0"
            >
              {mode === 'mock' ? (
                <>
                  <Database className="size-3.5 text-amber-500 shrink-0" />
                  <span className="hidden lg:inline font-mono text-xs">Mock</span>
                </>
              ) : (
                <>
                  <Globe className="size-3.5 text-primary shrink-0" />
                  <span className="hidden lg:inline font-mono text-xs">Live API</span>
                </>
              )}
            </Button>

            {/* Theme Toggle: Bright (Light) vs Dark Mode */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDarkMode}
              title={isDarkMode ? "Switch to Bright Mode (Light Theme)" : "Switch to Dark Mode"}
              aria-label={isDarkMode ? "Switch to Bright Mode (Light Theme)" : "Switch to Dark Mode"}
              className="gap-1.5 text-xs font-medium px-2 sm:px-2.5 h-8 shrink-0"
            >
              {isDarkMode ? (
                <>
                  <Sun className="size-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Bright</span>
                </>
              ) : (
                <>
                  <Moon className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </Button>
          </>
        )}

        {/* User Profile */}
        {currentUser ? (
          <div className="relative shrink-0">
            <button
              id="user-profile-menu-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 sm:pr-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted text-sm cursor-pointer transition-colors shrink-0"
            >
              <div className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.display_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-foreground max-w-[80px] md:max-w-[110px] truncate hidden sm:inline">
                {currentUser.display_name}
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
            </button>

            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-60 rounded-lg bg-card border border-border shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-sm"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="px-2 py-1.5 border-b border-border">
                  <p className="font-semibold text-foreground text-sm">{currentUser.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                </div>

                {/* Theme & Backend Quick Toggles inside dropdown */}
                <div className="py-1 border-b border-border space-y-0.5">
                  <div className="px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Preferences</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDarkMode();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted text-foreground flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {isDarkMode ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5 text-muted-foreground" />}
                      <span>Theme: {isDarkMode ? 'Bright (Light)' : 'Dark'}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">Switch</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMode();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted text-foreground flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {mode === 'mock' ? <Database className="size-3.5 text-amber-500" /> : <Globe className="size-3.5 text-primary" />}
                      <span>API Mode: {mode === 'mock' ? 'Mock Store' : 'Live REST API'}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">Switch</span>
                  </button>
                </div>
                {onRoleChange && (
                  <div className="py-1 border-b border-border">
                    <div className="px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">Role</div>
                    {(['admin', 'standard', 'restricted'] as Role[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => onRoleChange(r)}
                        className={`w-full text-left px-2 py-1 rounded text-xs capitalize flex justify-between ${
                          currentUser.role === r ? 'font-bold text-primary bg-primary/10' : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {r}
                        {currentUser.role === r && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer flex items-center gap-2 font-medium"
                  >
                    <LogOut className="size-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenAuth('login')}
            className="h-8 text-sm px-3 gap-1.5 font-bold shadow-xs"
          >
            <LogIn className="size-3.5" />
            <span>Sign In</span>
          </Button>
        )}
      </div>
    </header>
  );
}
