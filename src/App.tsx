import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab, FinancialSubTab } from './components/layout/Sidebar';
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
import { apiService } from './services/api';
import { User, Organization, Role, AuthResponse } from './types/api';
import { MOCK_USERS, MOCK_ORGANIZATIONS } from './services/mockData';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('invoices');
  const [financialSubTab, setFinancialSubTab] = useState<FinancialSubTab>('trial-balance');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
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

  const handleOpenUpload = (initialType?: 'invoice' | 'bank_statement') => {
    const selectedType = initialType || (currentTab === 'bank' ? 'bank_statement' : 'invoice');
    setUploadInitialType(selectedType);
    if (selectedType === 'bank_statement') {
      setCurrentTab('bank');
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
    if (allIds && allIds.length > 0) {
      setInvoiceIdsList(allIds);
    }
    setCurrentTab('invoices');
    // Auto-collapse sidebar to mini rail on review view to maximize horizontal space for data table
    setIsSidebarOpen(false);
  };

  const handleBackToInvoices = () => {
    setActiveInvoiceId(null);
    setInvoicesRefreshKey((k) => k + 1);
  };

  const activeOrg = organizations.find((o) => o.id === activeOrgId) || organizations[0];

  // Tab Breadcrumbs
  const tabTitles: Record<NavTab, string> = {
    invoices: activeInvoiceId ? 'Purchases / Invoice Review' : 'Purchases / All Invoices',
    dashboard: 'Dashboard / Overview',
    sales: 'Sales / Receivables',
    bank: 'Bank / Statement Reconciliation',
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
          onOpenUpload={(type) => handleOpenUpload(type)}
          currentUser={currentUser}
          mode={mode}
          onLogout={handleLogout}
          onOpenAuth={(m) => (m === 'login' ? setIsLoginOpen(true) : setIsRegisterOpen(true))}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-0 h-full overflow-hidden">
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
        <main className="flex-1 flex flex-col min-w-0 w-full overflow-y-auto overflow-x-hidden">
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
              {currentTab === 'invoices' && (
                <>
                  {activeInvoiceId ? (
                    <ReviewHub
                      invoiceId={activeInvoiceId}
                      activeOrgId={activeOrgId}
                      invoiceIds={invoiceIdsList}
                      onNavigateInvoice={(nextId) => setActiveInvoiceId(nextId)}
                      onBack={handleBackToInvoices}
                      onShowToast={showToast}
                    />
                  ) : (
                    <InvoiceList
                      activeOrgId={activeOrgId}
                      currentUser={currentUser}
                      refreshKey={invoicesRefreshKey}
                      onSelectInvoice={handleOpenReview}
                      onOpenUpload={(type) => handleOpenUpload(type || 'invoice')}
                      onShowToast={showToast}
                    />
                  )}
                </>
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
              {currentTab === 'bank' && (
                <BankReconciliationView
                  activeOrgId={activeOrgId}
                  refreshKey={bankRefreshKey}
                  onOpenUpload={(type) => handleOpenUpload(type || 'bank_statement')}
                  onShowToast={showToast}
                />
              )}
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
