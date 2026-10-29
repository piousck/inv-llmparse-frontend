import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Inbox, Landmark, FileSpreadsheet, FolderKanban } from 'lucide-react';
import { Sidebar, NavTab, FinancialSubTab, DocumentSubTab } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { InvoiceList } from './components/invoices/InvoiceList';
import { ReviewHub } from './components/review/ReviewHub';
import { UploadModal } from './components/invoices/UploadModal';
import { UsersView } from './components/users/UsersView';
import { DashboardView } from './components/modules/DashboardView';
import { SuppliersView } from './components/modules/SuppliersView';
import { SalesView } from './components/modules/SalesView';
import { BankReconciliationView } from './components/modules/BankReconciliationView';
import { CoaView } from './components/modules/CoaView';
import { VatRatesView } from './components/modules/VatRatesView';
import { ReportsView } from './components/modules/ReportsView';
import { SettingsView } from './components/modules/SettingsView';
import { FinancialStatementsView } from './components/modules/FinancialStatementsView';
import { LoginModal } from './components/auth/LoginModal';
import { RegisterModal } from './components/auth/RegisterModal';
import { SignedOutView } from './components/auth/SignedOutView';
import { Toast } from './components/ui/Toast';
import { cn } from './lib/utils';
import { apiService } from './services/api';
import { User, Organization, Role, AuthResponse } from './types/api';
import { MOCK_USERS, MOCK_ORGANIZATIONS } from './services/mockData';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('invoices');
  const [financialSubTab, setFinancialSubTab] = useState<FinancialSubTab>('trial-balance');
  const [documentSubTab, setDocumentSubTab] = useState<DocumentSubTab>('purchases');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('invoiceId');
      if (urlId) return urlId;
      return localStorage.getItem('invparse_active_invoice_id') || null;
    } catch {
      return null;
    }
  });
  const [invoiceIdsList, setInvoiceIdsList] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>(() => apiService.getCachedOrgs() || MOCK_ORGANIZATIONS);
  const [activeOrgId, setActiveOrgId] = useState<string>(() => apiService.getActiveOrgId() || MOCK_ORGANIZATIONS[0].id);
  const [currentUser, setCurrentUser] = useState<User | null>(() => apiService.getCurrentUser() || MOCK_USERS[0]);
  const [mode, setMode] = useState<'mock' | 'live'>(() => apiService.getMode());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [uploadInitialType, setUploadInitialType] = useState<'invoice' | 'bank_statement'>('invoice');
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [bankRefreshKey, setBankRefreshKey] = useState<number>(0);
  const [invoicesRefreshKey, setInvoicesRefreshKey] = useState<number>(0);

  const handleSelectDocumentSubTab = (subTab: DocumentSubTab) => {
    setDocumentSubTab(subTab);
    if (subTab === 'bank_statements') {
      setCurrentTab('bank');
      setActiveInvoiceId(null);
    } else {
      setCurrentTab('invoices');
      setActiveInvoiceId(null);
    }
  };

  const handleOpenUpload = (initialType?: 'invoice' | 'bank_statement') => {
    const selectedType =
      initialType ||
      (currentTab === 'bank' || documentSubTab === 'bank_statements'
        ? 'bank_statement'
        : 'invoice');
    setUploadInitialType(selectedType);
    if (selectedType === 'bank_statement') {
      setCurrentTab('bank');
      setDocumentSubTab('bank_statements');
      setActiveInvoiceId(null);
    }
    setIsUploadOpen(true);
  };

  // Sidebar visibility with localStorage persistence (defaults to closed on mobile viewports)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return false;
    }
    const saved = localStorage.getItem('invparse_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('invparse_sidebar_open', String(next));
      return next;
    });
  };

  // Global keyboard shortcut: Cmd+B / Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    initApp();

    const handleSessionExpired = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      setCurrentUser(null);
      setActiveInvoiceId(null);
      setOrganizations([]);
      showToast(customEvent.detail?.message || 'Your session has expired or token is invalid. Please sign in again.');
      setIsLoginOpen(true);
    };
    window.addEventListener('invparse:session-expired', handleSessionExpired);
    return () => window.removeEventListener('invparse:session-expired', handleSessionExpired);
  }, []);

  const initApp = async () => {
    try {
      const isLoggedOut = localStorage.getItem('invparse_logged_out') === 'true';
      if (apiService.getMode() === 'live' && !isLoggedOut) {
        await apiService.ensureLiveToken();
      }
      const user = apiService.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        const orgs = await apiService.getOrganizations();
        setOrganizations(orgs);
        const initialOrgId = apiService.getActiveOrgId() || orgs[0]?.id;
        setActiveOrgId(initialOrgId);
      } else {
        setOrganizations([]);
      }
      setMode(apiService.getMode());
    } catch (err) {
      console.error(err);
      showToast('Failed to initialize app settings');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleSelectOrg = (orgId: string) => {
    setActiveOrgId(orgId);
    apiService.setActiveOrgId(orgId);
    const org = organizations.find((o) => o.id === orgId);
    showToast(`Switched active scope to: ${org?.name}`);
  };

  const handleRoleChange = async (newRole: Role) => {
    if (!currentUser) return;
    try {
      const updated = await apiService.updateUser(currentUser.id, { role: newRole });
      setCurrentUser(updated);
      apiService.setCurrentUser(updated);
      showToast(`Switched role to: ${newRole.toUpperCase()}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMode = async () => {
    const nextMode = mode === 'mock' ? 'live' : 'mock';
    apiService.setMode(nextMode);
    setMode(nextMode);
    setActiveInvoiceId(null);
    await initApp();
    showToast(
      nextMode === 'live'
        ? 'Switched to Live REST API mode'
        : 'Switched to standalone Mock Store mode'
    );
  };

  const handleAuthSuccess = (auth: AuthResponse) => {
    setCurrentUser(auth.user);
    setActiveOrgId(auth.organization.id);
    initApp();
  };

  const handleLogout = () => {
    apiService.logout();
    setCurrentUser(null);
    setActiveInvoiceId(null);
    setIsLoginOpen(true);
    showToast('Signed out of account');
  };

  const handleQuickLogin = async (email: string) => {
    try {
      const res = await apiService.login(email, 'password123', true);
      handleAuthSuccess(res);
      showToast(`Welcome back, ${res.user.display_name}!`);
    } catch (err: any) {
      console.error(err);
      showToast(err.detail || 'Login failed');
    }
  };

  const handleOpenReview = (invoiceId: string, allIds?: string[]) => {
    setActiveInvoiceId(invoiceId);
    try {
      localStorage.setItem('invparse_active_invoice_id', invoiceId);
    } catch {}
    if (allIds && allIds.length > 0) {
      setInvoiceIdsList(allIds);
    }
    setDocumentSubTab('purchases');
    setCurrentTab('invoices');
    // Auto-collapse sidebar to mini rail on review view to maximize horizontal space for data table
    setIsSidebarOpen(false);
  };

  const handleBackToInvoices = () => {
    setActiveInvoiceId(null);
    try {
      localStorage.removeItem('invparse_active_invoice_id');
    } catch {}
    setInvoicesRefreshKey((k) => k + 1);
  };

  const activeOrg = organizations.find((o) => o.id === activeOrgId) || organizations[0];

  // Tab Breadcrumbs
  const tabTitles: Record<NavTab, string> = {
    invoices: activeInvoiceId
      ? 'Documents / Purchases / Invoice Review'
      : documentSubTab === 'supplier_statements'
      ? 'Documents / Supplier Statements'
      : documentSubTab === 'other_documents'
      ? 'Documents / Other Documents'
      : 'Documents / Purchases',
    dashboard: 'Dashboard / Overview',
    sales: 'Sales / Receivables',
    bank: 'Documents / Bank Statements',
    financials:
      financialSubTab === 'formatted-tb'
        ? 'Financials / Formatted Trial Balance'
        : financialSubTab === 'pnl'
        ? 'Financials / Profit & Loss'
        : 'Financials / Trial Balance',
    suppliers: 'Suppliers / Vendor Master',
    coa: 'Chart of Accounts / GL Codes',
    vat: 'VAT Rates / Irish Tax Codes',
    users: 'Team & Roles / User Management',
    reports: 'Reports / Financial Statements',
    settings: 'Settings / Configuration',
  };

  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden bg-background text-foreground selection:bg-primary/20">
      {/* Mobile backdrop for sidebar */}
      {currentUser && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
          onClick={handleToggleSidebar}
        />
      )}

      {/* Sidebar - only visible when signed in */}
      {currentUser && (
        <Sidebar
          isOpen={isSidebarOpen}
          onCloseMobile={handleToggleSidebar}
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'invoices') {
              setActiveInvoiceId(null);
            }
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsSidebarOpen(false);
            }
          }}
          activeFinancialSubTab={financialSubTab}
          onSelectFinancialSubTab={(sub) => {
            setFinancialSubTab(sub);
            setCurrentTab('financials');
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsSidebarOpen(false);
            }
          }}
          activeDocumentSubTab={documentSubTab}
          onSelectDocumentSubTab={handleSelectDocumentSubTab}
          onOpenUpload={(type) => handleOpenUpload(type)}
          currentUser={currentUser}
          mode={mode}
          onLogout={handleLogout}
          onOpenAuth={(m) => (m === 'login' ? setIsLoginOpen(true) : setIsRegisterOpen(true))}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full h-full overflow-hidden">
        {/* Topbar */}
        <Topbar
          organizations={organizations}
          activeOrgId={activeOrgId}
          onSelectOrg={handleSelectOrg}
          currentUser={currentUser}
          onRoleChange={handleRoleChange}
          onLogout={handleLogout}
          onOpenUpload={(type) => handleOpenUpload(type)}
          onOpenAuth={(m) => (m === 'login' ? setIsLoginOpen(true) : setIsRegisterOpen(true))}
          mode={mode}
          onToggleMode={handleToggleMode}
          breadcrumb={!currentUser ? 'Session / Signed Out' : tabTitles[currentTab]}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          currentTab={currentTab}
          activeInvoiceId={activeInvoiceId}
        />

        {/* View Switcher */}
        <main className={cn(
          "flex-1 flex flex-col min-w-0 w-full",
          (currentTab === 'invoices' || currentTab === 'bank') ? "h-full overflow-hidden" : "overflow-y-auto overflow-x-hidden"
        )}>
          {!currentUser ? (
            <SignedOutView
              onOpenLogin={() => setIsLoginOpen(true)}
              onOpenRegister={() => setIsRegisterOpen(true)}
              onQuickLogin={handleQuickLogin}
              mode={mode}
              onToggleMode={handleToggleMode}
            />
          ) : (
            <>
              {/* Document Section: Purchases, Bank Statements, Supplier Statements, Other Documents */}
              {(currentTab === 'invoices' || currentTab === 'bank') && (
                activeInvoiceId ? (
                  <ReviewHub
                    invoiceId={activeInvoiceId}
                    activeOrgId={activeOrgId}
                    invoiceIds={invoiceIdsList}
                    onNavigateInvoice={(nextId) => setActiveInvoiceId(nextId)}
                    onBack={handleBackToInvoices}
                    onShowToast={showToast}
                  />
                ) : (
                  <div className="flex-1 h-full min-h-0 p-3 sm:p-4 md:p-5 flex flex-col bg-background min-w-0 w-full max-w-full overflow-hidden">
                    {/* Top Document Category Switcher (Persistent across all 4 document sub-tabs) */}
                    <div className="flex items-center gap-1.5 p-1 bg-card rounded-xl border border-border shadow-xs mb-3.5 shrink-0 overflow-x-auto">
                      {(
                        [
                          { id: 'purchases', label: 'Purchases', icon: Inbox },
                          { id: 'bank_statements', label: 'Bank Statements', icon: Landmark },
                          { id: 'supplier_statements', label: 'Supplier Statements', icon: FileSpreadsheet },
                          { id: 'other_documents', label: 'Other Documents', icon: FolderKanban },
                        ] as const
                      ).map((cat) => {
                        const Icon = cat.icon;
                        const isActive = documentSubTab === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => handleSelectDocumentSubTab(cat.id)}
                            className={cn(
                              "relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap select-none",
                              isActive
                                ? "text-primary-foreground font-bold"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="activeDocCategoryTab"
                                className="absolute inset-0 bg-primary rounded-lg shadow-xs"
                                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                              />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5" />
                              <span>{cat.label}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Document Sub-View */}
                    <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
                      {documentSubTab === 'bank_statements' || currentTab === 'bank' ? (
                        <BankReconciliationView
                          activeOrgId={activeOrgId}
                          refreshKey={bankRefreshKey}
                          onOpenUpload={(type) => handleOpenUpload(type || 'bank_statement')}
                          onShowToast={showToast}
                          onSelectDocumentSubTab={handleSelectDocumentSubTab}
                          hideCategorySwitcher
                        />
                      ) : (
                        <InvoiceList
                          activeOrgId={activeOrgId}
                          currentUser={currentUser}
                          refreshKey={invoicesRefreshKey}
                          onSelectInvoice={handleOpenReview}
                          onOpenUpload={(type) => handleOpenUpload(type || 'invoice')}
                          onShowToast={showToast}
                          documentSubTab={documentSubTab}
                          onSelectDocumentSubTab={handleSelectDocumentSubTab}
                          hideCategorySwitcher
                        />
                      )}
                    </div>
                  </div>
                )
              )}

              {currentTab === 'dashboard' && <DashboardView onSelectInvoice={handleOpenReview} />}
              {currentTab === 'suppliers' && (
                <SuppliersView
                  activeOrgId={activeOrgId}
                  onShowToast={showToast}
                  onSelectInvoice={handleOpenReview}
                />
              )}
              {currentTab === 'sales' && <SalesView onShowToast={showToast} />}
              {currentTab === 'financials' && (
                <FinancialStatementsView
                  activeOrgId={activeOrgId}
                  activeSubTab={financialSubTab}
                  onChangeSubTab={(sub) => setFinancialSubTab(sub)}
                  onSelectInvoice={(invId) => handleOpenReview(invId)}
                  onNavigateToInvoices={() => setCurrentTab('invoices')}
                  onShowToast={showToast}
                />
              )}
              {currentTab === 'coa' && (
                <CoaView orgId={activeOrg?.id} industry={activeOrg?.industry} />
              )}
              {currentTab === 'vat' && <VatRatesView />}
              {currentTab === 'users' && (
                <UsersView
                  currentUser={currentUser}
                  organizations={organizations}
                  onShowToast={showToast}
                />
              )}
              {currentTab === 'reports' && <ReportsView onShowToast={showToast} />}
              {currentTab === 'settings' && activeOrg && (
                <SettingsView
                  activeOrg={activeOrg}
                  onUpdateOrg={(updated) => {
                    setOrganizations(
                      organizations.map((o) => (o.id === activeOrg.id ? { ...o, ...updated } : o))
                    );
                  }}
                  mode={mode}
                  onToggleMode={handleToggleMode}
                  onShowToast={showToast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Upload Invoice / Bank Statement Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setInvoicesRefreshKey((k) => k + 1);
          setBankRefreshKey((k) => k + 1);
        }}
        activeOrgId={activeOrgId}
        activeOrg={activeOrg}
        initialType={uploadInitialType}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'invoices') {
            setActiveInvoiceId(null);
          }
        }}
        onUploadSuccess={(invId, _allIds, targetTab) => {
          setBankRefreshKey((k) => k + 1);
          setInvoicesRefreshKey((k) => k + 1);
          if (invId) {
            showToast('Invoice processed! Opening review canvas...');
            handleOpenReview(invId);
          } else if (targetTab === 'invoices') {
            setCurrentTab('invoices');
            setActiveInvoiceId(null);
          } else {
            setCurrentTab('bank');
            setActiveInvoiceId(null);
          }
        }}
        onShowToast={showToast}
      />

      {/* Login & Register Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
        onShowToast={showToast}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
        onShowToast={showToast}
      />

      {/* Global Toast */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
};
