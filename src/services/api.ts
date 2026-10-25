import {
  User,
  Organization,
  InvoiceDetail,
  InvoicePageImage,
  LineItem,
  PaginatedInvoices,
  ReviewSurface,
  Supplier,
  SupplierActivity,
  SupplierInvoice,
  SupplierPayment,
  JobResponse,
  JobStatus,
  AuthResponse,
  Role,
  IndustryPreset,
  INDUSTRY_PRESETS,
  OrganizationGLAccount,
  OrganizationGLAccountCreate,
  OrganizationGLAccountUpdate,
  XERO_ACCOUNT_CODES,
  BankAccountDto,
  BankStatementUploadResult,
  BankStatementDto,
  BankTransactionDto,
  PaymentAllocationDto,
  ReviewQueueItemDto,
  DuplicateQueueItemDto,
  DuplicateReviewResponseDto,
  ProviderSettings,
  BulkUnlockResponse,
  AccountingYear,
  AccountingYearCreate,
  AccountingYearUpdate,
} from '../types/api';

import {
  MOCK_ORGANIZATIONS,
  MOCK_USERS,
  MOCK_INVOICES,
  MOCK_REVIEW_SURFACES,
  MOCK_SUPPLIERS,
  MOCK_BANK_TRANSACTIONS,
} from './mockData';

const STORAGE_KEYS = {
  MODE: 'invparse_mode',
  TOKEN: 'invparse_token',
  CURRENT_USER: 'invparse_user',
  CURRENT_ORG_ID: 'invparse_org_id',
  INVOICES: 'invparse_invoices_cache',
  USERS: 'invparse_users_cache',
  ORGS: 'invparse_orgs_cache',
  SUPPLIERS: 'invparse_suppliers_cache',
  API_BASE: 'invparse_api_base_url',
};

export class ApiService {
  private mode: 'mock' | 'live';
  private apiBaseUrl: string;

  constructor() {
    // Check if mode is stored, default to 'live' if not explicitly configured
    const storedMode = localStorage.getItem(STORAGE_KEYS.MODE) as 'mock' | 'live' | null;
    this.mode = storedMode || 'live';
    if (!storedMode) {
      localStorage.setItem(STORAGE_KEYS.MODE, this.mode);
    }

    const storedBase = localStorage.getItem(STORAGE_KEYS.API_BASE);
    // If empty or set to localhost:8000, normalize to '' to route via Vite proxy (/v1 -> http://localhost:8000)
    // This avoids browser cross-origin preflight checks (CORS) entirely.
    if (
      !storedBase ||
      storedBase === 'http://localhost:8000' ||
      storedBase === 'http://localhost:8000/' ||
      storedBase === 'http://127.0.0.1:8000' ||
      storedBase === 'http://127.0.0.1:8000/'
    ) {
      this.apiBaseUrl = '';
      localStorage.setItem(STORAGE_KEYS.API_BASE, '');
    } else {
      this.apiBaseUrl = storedBase;
    }
    this.initMockDatabase();
  }

  public getMode(): 'mock' | 'live' {
    return this.mode;
  }

  public setMode(mode: 'mock' | 'live') {
    this.mode = mode;
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
    if (mode === 'live') {
      const tok = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!tok || tok.startsWith('mock-jwt-')) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
    } else {
      const isLoggedOut = localStorage.getItem('invparse_logged_out') === 'true';
      const tok = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!isLoggedOut && (!tok || tok.split('.').length === 3)) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token-apex-admin');
      }
    }
  }

  public getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }

  public setApiBaseUrl(url: string) {
    const trimmed = (url || '').trim().replace(/\/+$/, '');
    if (
      trimmed === 'http://localhost:8000' ||
      trimmed === 'http://127.0.0.1:8000'
    ) {
      this.apiBaseUrl = '';
    } else {
      this.apiBaseUrl = trimmed;
    }
    localStorage.setItem(STORAGE_KEYS.API_BASE, this.apiBaseUrl);
  }

  public getUrl(endpoint: string): string {
    if (!this.apiBaseUrl) {
      return endpoint;
    }
    return `${this.apiBaseUrl}${endpoint}`;
  }

  /**
   * Ensures that a valid signed JWT exists when running in Live API mode.
   * Auto-authenticates against /v1/auth/user/token using default credentials if needed.
   */
  public async ensureLiveToken(forceRefresh = false): Promise<string | null> {
    if (this.mode !== 'live') return null;
    const isLoggedOut = localStorage.getItem('invparse_logged_out') === 'true';
    if (isLoggedOut) return null;

    const existingToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!existingToken) return null;

    // Token exists; validate structure and expiration
    if (
      !forceRefresh &&
      !existingToken.startsWith('mock-jwt-') &&
      existingToken.split('.').length === 3
    ) {
      try {
        const payload = JSON.parse(atob(existingToken.split('.')[1]));
        const exp = payload.exp ? payload.exp * 1000 : 0;
        // Verify token is not expired
        if (exp > Date.now()) {
          return existingToken;
        } else {
          // Token is expired! Log out immediately so user can authenticate cleanly
          console.warn('[ApiService] JWT token is expired. Logging out session.');
          this.logout();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('invparse:session-expired', {
                detail: { message: 'Your session has expired. Please sign in again.' },
              })
            );
          }
          return null;
        }
      } catch (err) {
        // Corrupted JWT payload
        console.warn('[ApiService] Corrupted JWT token detected. Logging out session:', err);
        this.logout();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('invparse:session-expired', {
              detail: { message: 'Invalid session token. Please sign in again.' },
            })
          );
        }
        return null;
      }
    } else if (!existingToken.startsWith('mock-jwt-')) {
      // Malformed JWT structure
      console.warn('[ApiService] Malformed JWT token detected. Logging out session.');
      this.logout();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('invparse:session-expired', {
            detail: { message: 'Invalid session token. Please sign in again.' },
          })
        );
      }
      return null;
    }

    return existingToken;
  }

  /**
   * Authenticated fetch helper for Live REST API mode.
   * Automatically attaches Bearer token and invalidates session on HTTP 401 Unauthorized.
   */
  public async authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.ensureLiveToken();
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await fetch(this.getUrl(endpoint), { ...options, headers });
    if (res.status === 401 && this.mode === 'live') {
      console.warn(`[ApiService] Received HTTP 401 Unauthorized from ${endpoint}. Invalidating session.`);
      this.logout();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('invparse:session-expired', {
            detail: { message: 'Your session has expired or your token is invalid. Please sign in again.' },
          })
        );
      }
    }
    return res;
  }

  private initMockDatabase() {
    if (!localStorage.getItem(STORAGE_KEYS.ORGS)) {
      localStorage.setItem(STORAGE_KEYS.ORGS, JSON.stringify(MOCK_ORGANIZATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(MOCK_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(MOCK_INVOICES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(MOCK_SUPPLIERS));
    }
    const isLoggedOut = localStorage.getItem('invparse_logged_out') === 'true';
    if (!isLoggedOut && !localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      const defaultUser = this.mode === 'live'
        ? {
            id: '8998f2df-07c7-49e3-bee6-8ae595012d75',
            tenant_id: '744f4caf-cfa7-473f-8665-2ce6c13cd236',
            organization_id: '11111111-1111-4111-8111-111111111111',
            email: 'admin@apexpractice.ie',
            display_name: 'Sarah Connor (Practice Admin)',
            side: 'provider' as const,
            tier: 'provider_super_admin',
            role: 'admin' as const,
            is_active: true,
            created_at: '2026-09-04T12:00:00Z',
          }
        : MOCK_USERS[0];
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser));
      localStorage.setItem(STORAGE_KEYS.CURRENT_ORG_ID, defaultUser.organization_id);
      if (this.mode === 'mock') {
        localStorage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token-apex-admin');
      }
    }
  }

  public getCachedOrgs(): Organization[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ORGS);
    return raw ? JSON.parse(raw) : MOCK_ORGANIZATIONS;
  }

  private setCachedOrgs(orgs: Organization[]) {
    localStorage.setItem(STORAGE_KEYS.ORGS, JSON.stringify(orgs));
  }

  private getCachedUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : MOCK_USERS;
  }

  private setCachedUsers(users: User[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  private getCachedInvoices(): InvoiceDetail[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!raw) return MOCK_INVOICES;
    try {
      const cached: InvoiceDetail[] = JSON.parse(raw);
      const existingIds = new Set(cached.map((i) => i.id));
      const missing = MOCK_INVOICES.filter((i) => !existingIds.has(i.id));
      let merged = [...cached, ...missing];
      // Auto-heal cached mock invoices:
      // 1. If line items gross sum does not match total_gross (e.g. stale lines), or
      // 2. If it's the known Amazon UK mock invoice with legacy £250/£200 line items
      let changed = false;
      merged = merged.map((inv) => {
        const fresh = MOCK_INVOICES.find((m) => m.id === inv.id);
        if (fresh) {
          const cachedLinesSum = (inv.line_items || []).reduce(
            (sum, l) => sum + Number(l.gross_amount || (Number(l.net_amount || 0) + Number(l.vat_amount || 0))),
            0
          );
          const hasMismatch = Math.abs(cachedLinesSum - Number(inv.total_gross || 0)) > 0.05;
          const isStaleUkAmazon =
            inv.id === 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90' &&
            (inv.line_items?.[0]?.gross_amount === 250 || cachedLinesSum !== 540);

          if (hasMismatch || isStaleUkAmazon) {
            changed = true;
            return {
              ...fresh,
              requires_human_review: inv.requires_human_review ?? fresh.requires_human_review,
            };
          }
        }
        return inv;
      });
      if (changed || missing.length > 0) {
        this.setCachedInvoices(merged);
      }
      return merged;
    } catch {
      return MOCK_INVOICES;
    }
  }

  private setCachedInvoices(invoices: InvoiceDetail[]) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }

  private getCachedSuppliers(): Supplier[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    return raw ? JSON.parse(raw) : MOCK_SUPPLIERS;
  }

  private setCachedSuppliers(suppliers: Supplier[]) {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  }

  // --- Auth & Session ---

  public getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  }

  public setCurrentUser(user: User) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  public getActiveOrgId(): string {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_ORG_ID) || MOCK_ORGANIZATIONS[0].id;
  }

  public setActiveOrgId(orgId: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ORG_ID, orgId);
  }

  public async login(email: string, password: string, trustComputer: boolean = false): Promise<AuthResponse> {
    localStorage.removeItem('invparse_logged_out');
    if (this.mode === 'live') {
      try {
        const res = await fetch(this.getUrl('/v1/auth/user/token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, trust_computer: trustComputer }),
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
          const userRes = await this.getCurrentUserLive(data.access_token);
          return userRes;
        }
        const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
        throw err;
      } catch (err: any) {
        console.warn('[ApiService] Live login failed:', err);
        if (err.name === 'TypeError' || !err.detail) {
          console.warn('[ApiService] Backend is unreachable; proceeding with mock session.');
        } else {
          throw err;
        }
      }
    }

    // Mock Login
    const users = this.getCachedUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || users[0];
    const orgs = this.getCachedOrgs();
    const org = orgs.find((o) => o.id === user.organization_id) || orgs[0];

    const authRes: AuthResponse = {
      access_token: `mock-jwt-token-${user.role}`,
      token_type: 'bearer',
      expires_in: trustComputer ? 2592000 : 7200,
      user,
      organization: org,
    };

    localStorage.setItem(STORAGE_KEYS.TOKEN, authRes.access_token);
    this.setCurrentUser(user);
    this.setActiveOrgId(org.id);
    return authRes;
  }

  public async register(payload: {
    organization_name: string;
    org_type: 'accounting' | 'client';
    industry?: string;
    email: string;
    password: string;
    display_name?: string;
    trust_computer?: boolean;
  }): Promise<AuthResponse> {
    if (this.mode === 'live') {
      try {
        const res = await fetch(this.getUrl('/v1/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_name: payload.organization_name,
            org_type: payload.org_type,
            industry: payload.industry,
            email: payload.email,
            password: payload.password,
            display_name: payload.display_name,
            trust_computer: payload.trust_computer ?? false,
          }),
        });
        if (res.ok) {
          const data: AuthResponse = await res.json();
          if (data.access_token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
          }
          if (data.user) {
            this.setCurrentUser(data.user);
          }
          if (data.organization) {
            this.setActiveOrgId(data.organization.id);
            this.setCachedOrgs([data.organization]);
          }
          localStorage.removeItem('invparse_logged_out');
          return data;
        }
        const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
        throw err;
      } catch (err: any) {
        console.warn('[ApiService] Live register failed:', err);
        if (err.name === 'TypeError' || !err.detail) {
          console.warn('[ApiService] Backend is unreachable; creating mock user in local store.');
        } else {
          throw err;
        }
      }
    }

    const orgId = 'org-' + Math.random().toString(36).substring(2, 9);
    const userId = 'user-' + Math.random().toString(36).substring(2, 9);

    const newOrg: Organization = {
      id: orgId,
      tenant_id: orgId,
      name: payload.organization_name,
      org_type: payload.org_type,
      managing_org_id: null,
      industry: (payload.industry as any) || 'general',
      custom_accounting_notes: null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const newUser: User = {
      id: userId,
      tenant_id: orgId,
      organization_id: orgId,
      email: payload.email,
      display_name: payload.display_name || payload.email.split('@')[0],
      side: 'user_org',
      tier: 'org_admin',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const orgs = [newOrg, ...this.getCachedOrgs()];
    const users = [newUser, ...this.getCachedUsers()];
    this.setCachedOrgs(orgs);
    this.setCachedUsers(users);

    this.setCurrentUser(newUser);
    this.setActiveOrgId(newOrg.id);
    localStorage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token-registered');

    return {
      access_token: 'mock-jwt-token-registered',
      token_type: 'bearer',
      expires_in: 7200,
      user: newUser,
      organization: newOrg,
    };
  }

  public logout() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ORG_ID);
    localStorage.removeItem(STORAGE_KEYS.ORGS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
    localStorage.setItem('invparse_logged_out', 'true');
  }

  private async getCurrentUserLive(token: string): Promise<AuthResponse> {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const orgId = payload.organization_id || this.getActiveOrgId();
      const email = payload.email || 'admin@apexpractice.ie';
      const isApex = email.toLowerCase() === 'admin@apexpractice.ie';
      const user: User = {
        id: payload.user_id || payload.sub || 'live-admin-user',
        tenant_id: payload.tenant_id || orgId,
        organization_id: orgId,
        email,
        display_name: isApex ? 'Practice Admin (Live)' : (payload.display_name || email.split('@')[0]),
        side: payload.side || 'user_org',
        tier: payload.tier || 'org_admin',
        role: payload.role || 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      this.setCurrentUser(user);
      this.setActiveOrgId(orgId);

      const orgs = await this.getOrganizations();
      const org = orgs.find((o) => o.id === orgId) || orgs[0] || MOCK_ORGANIZATIONS[0];

      return {
        access_token: token,
        token_type: 'bearer',
        expires_in: 28800,
        user,
        organization: org,
      };
    } catch {
      const user = this.getCurrentUser() || MOCK_USERS[0];
      const org = this.getCachedOrgs()[0];
      return {
        access_token: token,
        token_type: 'bearer',
        expires_in: 7200,
        user,
        organization: org,
      };
    }
  }

  // --- Organizations ---

  public async getOrganizations(): Promise<Organization[]> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch('/v1/organizations');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            this.setCachedOrgs(data);
            const active = this.getActiveOrgId();
            if (!data.some((o) => o.id === active)) {
              this.setActiveOrgId(data[0].id);
            }
            return data;
          }
        }
      } catch (err) {
        console.warn('[ApiService] Live getOrganizations failed, falling back to cached mock data:', err);
      }
    }
    const cached = this.getCachedOrgs();
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.side !== 'provider' && currentUser.organization_id) {
      const filtered = cached.filter(
        (o) => o.id === currentUser.organization_id || o.managing_org_id === currentUser.organization_id
      );
      if (filtered.length > 0) return filtered;
    }
    return cached;
  }

  public async createOrganization(data: {
    name: string;
    org_type: 'client';
    industry: string;
    custom_accounting_notes?: string;
  }): Promise<Organization> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch('/v1/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const newOrg = await res.json();
          const orgs = [...this.getCachedOrgs(), newOrg];
          this.setCachedOrgs(orgs);
          return newOrg;
        }
      } catch (err) {
        console.warn('[ApiService] Live createOrganization failed, writing to local mock store:', err);
      }
    }

    const currentOrg = this.getActiveOrgId();
    const newOrg: Organization = {
      id: 'org-' + Math.random().toString(36).substring(2, 9),
      tenant_id: currentOrg,
      name: data.name,
      org_type: 'client',
      managing_org_id: currentOrg,
      industry: data.industry as any,
      custom_accounting_notes: data.custom_accounting_notes || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const orgs = [...this.getCachedOrgs(), newOrg];
    this.setCachedOrgs(orgs);
    return newOrg;
  }

  public async updateOrganization(orgId: string, data: Partial<Organization>): Promise<Organization> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          const orgs = this.getCachedOrgs().map((o) => (o.id === orgId ? { ...o, ...updated } : o));
          this.setCachedOrgs(orgs);
          return updated;
        }
      } catch (err) {
        console.warn('[ApiService] Live updateOrganization failed, writing to local mock store:', err);
      }
    }

    const orgs = this.getCachedOrgs().map((o) => (o.id === orgId ? { ...o, ...data } : o));
    this.setCachedOrgs(orgs);
    return orgs.find((o) => o.id === orgId)!;
  }

  // ── Provider Admin Runtime Settings ──

  public async getProviderSettings(): Promise<ProviderSettings> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch('/v1/provider/settings');
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[ApiService] Live getProviderSettings failed, using fallback:', err);
      }
    }
    const raw = localStorage.getItem('invparse_provider_settings');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return { default_capitalization_threshold: 500.0 };
  }

  public async updateProviderSettings(data: Partial<ProviderSettings>): Promise<ProviderSettings> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch('/v1/provider/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          localStorage.setItem('invparse_provider_settings', JSON.stringify(updated));
          return updated;
        }
      } catch (err) {
        console.warn('[ApiService] Live updateProviderSettings failed, writing to local store:', err);
      }
    }
    const current = await this.getProviderSettings();
    const updated = { ...current, ...data };
    localStorage.setItem('invparse_provider_settings', JSON.stringify(updated));
    return updated;
  }

  // ── Organization General Ledger Accounts ──

  private getMockGLAccounts(orgId: string): OrganizationGLAccount[] {
    const key = `invparse_gl_accounts_${orgId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    const defaults: OrganizationGLAccount[] = XERO_ACCOUNT_CODES.map((acc) => ({
      id: `gl-${orgId}-${acc.code}`,
      tenant_id: 'tenant-default',
      organization_id: orgId,
      code: acc.code,
      name: acc.name,
      category: acc.category,
      default_tax_rate: acc.defaultVatCode,
      description:
        acc.code === '300'
          ? 'Section 60(2) stock-in-trade resale exception (100% claimable)'
          : acc.code === '413'
          ? 'Section 60(1) client entertainment disallowance (Non-deductible TN)'
          : 'Standard expense account',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }

  private setMockGLAccounts(orgId: string, accounts: OrganizationGLAccount[]) {
    const key = `invparse_gl_accounts_${orgId}`;
    localStorage.setItem(key, JSON.stringify(accounts));
  }

  private getMockAccountingYears(orgId: string): AccountingYear[] {
    const key = `invparse_accounting_years_${orgId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    const currentYear = new Date().getFullYear();
    const defaults: AccountingYear[] = [
      {
        id: `ay-${orgId}-${currentYear - 1}`,
        organization_id: orgId,
        name: `FY ${currentYear - 1}`,
        start_date: `${currentYear - 1}-01-01`,
        end_date: `${currentYear - 1}-12-31`,
        is_closed: true,
        closed_at: `${currentYear}-01-15T10:00:00Z`,
        closed_by: 'admin@system.com',
        created_at: `${currentYear - 1}-01-01T00:00:00Z`,
        updated_at: `${currentYear}-01-15T10:00:00Z`,
      },
      {
        id: `ay-${orgId}-${currentYear}`,
        organization_id: orgId,
        name: `FY ${currentYear}`,
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
        is_closed: false,
        closed_at: null,
        closed_by: null,
        created_at: `${currentYear}-01-01T00:00:00Z`,
        updated_at: `${currentYear}-01-01T00:00:00Z`,
      },
    ];
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }

  private setMockAccountingYears(orgId: string, years: AccountingYear[]) {
    const key = `invparse_accounting_years_${orgId}`;
    localStorage.setItem(key, JSON.stringify(years));
  }

  public async getAccountingYears(orgId: string): Promise<AccountingYear[]> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/accounting-years`);
        if (res.ok) {
          const data = await res.json();
          this.setMockAccountingYears(orgId, data);
          return data;
        }
      } catch (err) {
        console.warn('[ApiService] Live getAccountingYears failed, falling back to local store:', err);
      }
    }
    return this.getMockAccountingYears(orgId);
  }

  public async createAccountingYear(
    orgId: string,
    data: AccountingYearCreate
  ): Promise<AccountingYear> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/accounting-years`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const created = await res.json();
          const existing = this.getMockAccountingYears(orgId);
          this.setMockAccountingYears(orgId, [created, ...existing]);
          return created;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to create accounting year');
      } catch (err: any) {
        if (this.mode === 'live' && !err.message?.includes('fetch')) {
          throw err;
        }
        console.warn('[ApiService] Live createAccountingYear failed, fallback to local store:', err);
      }
    }

    const existing = this.getMockAccountingYears(orgId);
    if (existing.some((y) => y.name.toLowerCase() === data.name.trim().toLowerCase())) {
      throw new Error(`Accounting year '${data.name}' already exists for this organization`);
    }
    const newYear: AccountingYear = {
      id: 'ay-' + Math.random().toString(36).substring(2, 9),
      organization_id: orgId,
      name: data.name.trim(),
      start_date: data.start_date,
      end_date: data.end_date,
      is_closed: false,
      closed_at: null,
      closed_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.setMockAccountingYears(orgId, [newYear, ...existing]);
    return newYear;
  }

  public async updateAccountingYear(
    orgId: string,
    yearId: string,
    data: AccountingYearUpdate
  ): Promise<AccountingYear> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/accounting-years/${yearId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          const existing = this.getMockAccountingYears(orgId);
          this.setMockAccountingYears(
            orgId,
            existing.map((y) => (y.id === yearId ? updated : y))
          );
          return updated;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to update accounting year');
      } catch (err: any) {
        if (this.mode === 'live' && !err.message?.includes('fetch')) {
          throw err;
        }
        console.warn('[ApiService] Live updateAccountingYear failed, fallback to local store:', err);
      }
    }

    const existing = this.getMockAccountingYears(orgId);
    const target = existing.find((y) => y.id === yearId);
    if (!target) throw new Error('Accounting year not found');
    const updated: AccountingYear = {
      ...target,
      name: data.name !== undefined ? data.name.trim() : target.name,
      start_date: data.start_date !== undefined ? data.start_date : target.start_date,
      end_date: data.end_date !== undefined ? data.end_date : target.end_date,
      updated_at: new Date().toISOString(),
    };
    this.setMockAccountingYears(
      orgId,
      existing.map((y) => (y.id === yearId ? updated : y))
    );
    return updated;
  }

  public async closeAccountingYear(orgId: string, yearId: string): Promise<AccountingYear> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/accounting-years/${yearId}/close`, {
          method: 'POST',
        });
        if (res.ok) {
          const closed = await res.json();
          const existing = this.getMockAccountingYears(orgId);
          this.setMockAccountingYears(
            orgId,
            existing.map((y) => (y.id === yearId ? closed : y))
          );
          return closed;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to close accounting year');
      } catch (err: any) {
        if (this.mode === 'live' && !err.message?.includes('fetch')) {
          throw err;
        }
        console.warn('[ApiService] Live closeAccountingYear failed, fallback to local store:', err);
      }
    }

    const existing = this.getMockAccountingYears(orgId);
    const target = existing.find((y) => y.id === yearId);
    if (!target) throw new Error('Accounting year not found');
    const user = this.getCurrentUser();
    const closed: AccountingYear = {
      ...target,
      is_closed: true,
      closed_at: new Date().toISOString(),
      closed_by: user?.email || user?.display_name || 'Admin Operator',
      updated_at: new Date().toISOString(),
    };
    this.setMockAccountingYears(
      orgId,
      existing.map((y) => (y.id === yearId ? closed : y))
    );
    return closed;
  }

  public async reopenAccountingYear(orgId: string, yearId: string): Promise<AccountingYear> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/accounting-years/${yearId}/reopen`, {
          method: 'POST',
        });
        if (res.ok) {
          const reopened = await res.json();
          const existing = this.getMockAccountingYears(orgId);
          this.setMockAccountingYears(
            orgId,
            existing.map((y) => (y.id === yearId ? reopened : y))
          );
          return reopened;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to reopen accounting year');
      } catch (err: any) {
        if (this.mode === 'live' && !err.message?.includes('fetch')) {
          throw err;
        }
        console.warn('[ApiService] Live reopenAccountingYear failed, fallback to local store:', err);
      }
    }

    const existing = this.getMockAccountingYears(orgId);
    const target = existing.find((y) => y.id === yearId);
    if (!target) throw new Error('Accounting year not found');
    const reopened: AccountingYear = {
      ...target,
      is_closed: false,
      updated_at: new Date().toISOString(),
    };
    this.setMockAccountingYears(
      orgId,
      existing.map((y) => (y.id === yearId ? reopened : y))
    );
    return reopened;
  }

  public async deleteAccountingYear(orgId: string, yearId: string): Promise<void> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/accounting-years/${yearId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const existing = this.getMockAccountingYears(orgId);
          this.setMockAccountingYears(
            orgId,
            existing.filter((y) => y.id !== yearId)
          );
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to delete accounting year');
      } catch (err: any) {
        if (this.mode === 'live' && !err.message?.includes('fetch')) {
          throw err;
        }
        console.warn('[ApiService] Live deleteAccountingYear failed, fallback to local store:', err);
      }
    }

    const existing = this.getMockAccountingYears(orgId);
    const target = existing.find((y) => y.id === yearId);
    if (target?.is_closed) {
      throw new Error('Cannot delete a closed accounting year. Reopen it first.');
    }
    this.setMockAccountingYears(
      orgId,
      existing.filter((y) => y.id !== yearId)
    );
  }


  public async getOrganizationGLAccounts(orgId: string): Promise<OrganizationGLAccount[]> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/gl-accounts?auto_seed=true`);
        if (res.ok) {
          const data = await res.json();
          this.setMockGLAccounts(orgId, data);
          return data;
        }
      } catch (err) {
        console.warn('[ApiService] Live getOrganizationGLAccounts failed, falling back to local storage:', err);
      }
    }
    return this.getMockGLAccounts(orgId);
  }

  public async createOrganizationGLAccount(
    orgId: string,
    data: OrganizationGLAccountCreate
  ): Promise<OrganizationGLAccount> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/gl-accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const created = await res.json();
          const existing = this.getMockGLAccounts(orgId);
          this.setMockGLAccounts(orgId, [...existing, created]);
          return created;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to create GL account');
      } catch (err: any) {
        if (this.mode === 'live' && !err.message?.includes('fetch')) {
          throw err;
        }
        console.warn('[ApiService] Live createOrganizationGLAccount failed, fallback to local store:', err);
      }
    }

    const existing = this.getMockGLAccounts(orgId);
    if (existing.some((a) => a.code === data.code.trim())) {
      throw new Error(`GL account with code '${data.code}' already exists`);
    }
    const newAcc: OrganizationGLAccount = {
      id: 'gl-' + Math.random().toString(36).substring(2, 9),
      tenant_id: 'tenant-default',
      organization_id: orgId,
      code: data.code.trim(),
      name: data.name.trim(),
      category: data.category.trim(),
      default_tax_rate: data.default_tax_rate || null,
      description: data.description || null,
      is_active: data.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.setMockGLAccounts(orgId, [...existing, newAcc]);
    return newAcc;
  }

  public async updateOrganizationGLAccount(
    orgId: string,
    accountId: string,
    data: OrganizationGLAccountUpdate
  ): Promise<OrganizationGLAccount> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/gl-accounts/${accountId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          const existing = this.getMockGLAccounts(orgId);
          this.setMockGLAccounts(
            orgId,
            existing.map((a) => (a.id === accountId ? updated : a))
          );
          return updated;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to update GL account');
      } catch (err: any) {
        if (this.mode === 'live' && !err.message?.includes('fetch')) {
          throw err;
        }
        console.warn('[ApiService] Live updateOrganizationGLAccount failed, fallback to local store:', err);
      }
    }

    const existing = this.getMockGLAccounts(orgId);
    const target = existing.find((a) => a.id === accountId);
    if (!target) throw new Error('GL account not found');

    const updated: OrganizationGLAccount = {
      ...target,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.setMockGLAccounts(
      orgId,
      existing.map((a) => (a.id === accountId ? updated : a))
    );
    return updated;
  }

  public async deleteOrganizationGLAccount(orgId: string, accountId: string): Promise<void> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/gl-accounts/${accountId}`, {
          method: 'DELETE',
        });
        if (res.ok || res.status === 204) {
          const existing = this.getMockGLAccounts(orgId);
          this.setMockGLAccounts(
            orgId,
            existing.filter((a) => a.id !== accountId)
          );
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to delete GL account');
      } catch (err: any) {
        if (this.mode === 'live' && !err.message?.includes('fetch')) {
          throw err;
        }
        console.warn('[ApiService] Live deleteOrganizationGLAccount failed, fallback to local store:', err);
      }
    }

    const existing = this.getMockGLAccounts(orgId);
    this.setMockGLAccounts(
      orgId,
      existing.filter((a) => a.id !== accountId)
    );
  }

  public async seedOrganizationGLAccounts(
    orgId: string,
    reset: boolean = false,
    industry?: string | null
  ): Promise<OrganizationGLAccount[]> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/gl-accounts/seed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reset_existing: reset, industry: industry || undefined }),
        });
        if (res.ok) {
          const accounts = await this.getOrganizationGLAccounts(orgId);
          return accounts;
        }
      } catch (err) {
        console.warn('[ApiService] Live seedOrganizationGLAccounts failed, fallback to local store:', err);
      }
    }

    localStorage.removeItem(`invparse_gl_accounts_${orgId}`);
    return this.getMockGLAccounts(orgId);
  }

  // --- Users ---

  public async getUsers(): Promise<User[]> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch('/v1/users');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            this.setCachedUsers(data);
            return data;
          }
        }
      } catch (err) {
        console.warn('[ApiService] Live getUsers failed, falling back to cached mock data:', err);
      }
    }
    return this.getCachedUsers();
  }

  public async createUser(data: {
    email: string;
    password?: string;
    display_name?: string;
    organization_id: string;
    role: Role;
  }): Promise<User> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch('/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const newUser = await res.json();
          const users = [...this.getCachedUsers(), newUser];
          this.setCachedUsers(users);
          return newUser;
        }
      } catch (err) {
        console.warn('[ApiService] Live createUser failed, writing to local mock store:', err);
      }
    }

    const newUser: User = {
      id: 'user-' + Math.random().toString(36).substring(2, 9),
      tenant_id: data.organization_id,
      organization_id: data.organization_id,
      email: data.email,
      display_name: data.display_name || data.email.split('@')[0],
      side: 'user_org',
      tier: data.role === 'admin' ? 'org_admin' : data.role === 'standard' ? 'staff' : 'viewer',
      role: data.role,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const users = [...this.getCachedUsers(), newUser];
    this.setCachedUsers(users);
    return newUser;
  }

  public async updateUser(userId: string, data: Partial<User>): Promise<User> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          const users = this.getCachedUsers().map((u) => (u.id === userId ? { ...u, ...updated } : u));
          this.setCachedUsers(users);
          return updated;
        }
      } catch (err) {
        console.warn('[ApiService] Live updateUser failed, writing to local mock store:', err);
      }
    }

    const users = this.getCachedUsers().map((u) => (u.id === userId ? { ...u, ...data } : u));
    this.setCachedUsers(users);
    return users.find((u) => u.id === userId)!;
  }

  public async deactivateUser(userId: string): Promise<User> {
    return this.updateUser(userId, { is_active: false });
  }

  // --- Invoices & Ingestion ---

  public async getInvoices(
    orgId: string,
    params?: { status_filter?: string; search?: string; page?: number; page_size?: number }
  ): Promise<PaginatedInvoices> {
    if (this.mode === 'live') {
      try {
        const q = new URLSearchParams();
        if (params?.status_filter && params.status_filter !== 'all') {
          q.set('status_filter', params.status_filter);
        }
        if (params?.search) q.set('search', params.search);
        if (params?.page) q.set('page', params.page.toString());
        if (params?.page_size) q.set('page_size', params.page_size.toString());

        const res = await this.authFetch(`/v1/organizations/${orgId}/invoices?${q.toString()}`);
        if (res.ok) {
          const raw = await res.json();
          return {
            total: raw.total,
            page: raw.page,
            page_size: raw.page_size,
            total_pages: raw.total_pages,
            items: (raw.items || []).map((inv: any) => {
              const gross = Number(inv.total_gross || 0);
              const vat = inv.total_vat != null ? Number(inv.total_vat) : (inv.total_net != null ? Math.round((gross - Number(inv.total_net)) * 100) / 100 : 0);
              const net = inv.total_net != null ? Number(inv.total_net) : Math.round((gross - vat) * 100) / 100;
              return {
                ...inv,
                total_net: net,
                total_vat: vat,
                total_gross: gross,
                ocr_confidence: Number(inv.ocr_confidence || 0),
                job_status: (inv.job_status || '').toLowerCase() as JobStatus,
                is_period_locked: Boolean(inv.is_period_locked),
                locked_year_name: inv.locked_year_name || null,
              };
            }),
          };
        }
      } catch (err) {
        console.warn('[ApiService] Live getInvoices failed, falling back to cached mock invoices:', err);
      }
    }

    // Mock filtering
    const currentUser = this.getCurrentUser();
    let all = this.getCachedInvoices();

    // Org filter
    const orgs = this.getCachedOrgs();
    const currentOrgObj = orgs.find((o) => o.id === orgId);
    if (currentOrgObj && currentOrgObj.org_type === 'client') {
      all = all.filter((inv) => inv.organization_id === orgId);
    }

    // Restricted uploader scoping
    if (currentUser?.role === 'restricted') {
      all = all.filter((inv) => inv.created_by_user_id === currentUser.id);
    }

    // Status filter
    const status = params?.status_filter || 'all';
    if (status !== 'all') {
      if (status === 'needs_review') {
        all = all.filter((inv) => inv.requires_human_review);
      } else if (status === 'completed') {
        all = all.filter((inv) => !inv.requires_human_review);
      }
    }

    // Search
    if (params?.search) {
      const term = params.search.toLowerCase();
      all = all.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(term) ||
          inv.seller_name.toLowerCase().includes(term)
      );
    }

    const page = params?.page || 1;
    const pageSize = params?.page_size || 20;
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const paged = all.slice(start, start + pageSize);

    const closedYears = (this.getMockAccountingYears(orgId) || []).filter((y) => y.is_closed);

    const items = paged.map((inv) => {
      const gross = Number(inv.total_gross || 0);
      const vat = inv.total_vat != null ? Number(inv.total_vat) : (inv.total_net != null ? Math.round((gross - Number(inv.total_net)) * 100) / 100 : 0);
      const net = inv.total_net != null ? Number(inv.total_net) : Math.round((gross - vat) * 100) / 100;
      const lockedYear = closedYears.find((y) => inv.invoice_date >= y.start_date && inv.invoice_date <= y.end_date);

      return {
        job_id: inv.job_id,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        seller_name: inv.seller_name,
        total_net: net,
        total_vat: vat,
        total_gross: gross,
        currency: inv.currency,
        job_status: inv.requires_human_review ? ('needs_review' as const) : ('completed' as const),
        requires_human_review: inv.requires_human_review,
        ocr_confidence: inv.ocr_confidence,
        error_code: null,
        error_message: null,
        original_filename: `${inv.invoice_number}.pdf`,
        duplicate_of_job_id: null,
        created_by_user_id: inv.created_by_user_id,
        created_at: inv.created_at,
        is_period_locked: Boolean(lockedYear),
        locked_year_name: lockedYear ? lockedYear.name : null,
      };
    });


    return {
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      items,
    };
  }

  public async getReportingInvoices(orgId?: string, onlyApproved: boolean = true): Promise<InvoiceDetail[]> {
    if (this.mode === 'live' && orgId) {
      try {
        const paged = await this.getInvoices(orgId, {
          page_size: 100,
          status_filter: onlyApproved ? 'completed' : undefined,
        });
        if (paged.items.length > 0) {
          const validItems = paged.items.filter((item) => Boolean(item.invoice_id));
          const details = await Promise.all(
            validItems.map((item) => this.getInvoiceDetails(item.invoice_id!, false).catch(() => null))
          );
          const valid = details.filter((d): d is InvoiceDetail => d !== null);
          if (valid.length > 0) {
            return onlyApproved
              ? valid.filter((i) => !i.requires_human_review || i.status === 'approved' || i.is_approved === true)
              : valid;
          }
        }
      } catch (err) {
        console.warn('[ApiService] Live getReportingInvoices failed, using cached invoices:', err);
      }
    }

    let invoices = this.getCachedInvoices();
    if (orgId) {
      const orgs = this.getCachedOrgs();
      const currentOrg = orgs.find((o) => o.id === orgId);
      if (currentOrg && currentOrg.org_type === 'client') {
        invoices = invoices.filter((i) => i.organization_id === orgId);
      }
    }
    if (onlyApproved) {
      invoices = invoices.filter(
        (i) => !i.requires_human_review || i.status === 'approved' || i.is_approved === true
      );
    }
    return invoices;
  }

  public async getInvoiceDetails(invoiceId: string, fetchMedia: boolean = true): Promise<InvoiceDetail> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/invoices/${invoiceId}`);
        if (res.ok) {
          const raw = await res.json();

          // Fetch original document as blob for canvas viewer only when requested
          let documentUrl: string | undefined;
          let pageImageUrl: string | undefined;
          let docType: 'pdf' | 'image' = 'image';
          const pages: InvoicePageImage[] = [];

          const extData = raw.extracted_data || {};
          const metaData = extData.extraction_metadata || {};
          const totalPages = Math.max(
            raw.page_count || 1,
            extData.raw_ocr?.page_count || 1,
            metaData.page_count || 1,
            (raw.page_numbers && raw.page_numbers.length) || 1,
            (extData.page_numbers && extData.page_numbers.length) || 1
          );

          const rawPageNumbers: number[] =
            totalPages > 1
              ? Array.from({ length: totalPages }, (_, i) => i + 1)
              : raw.page_numbers && raw.page_numbers.length > 0
              ? raw.page_numbers
              : extData.page_numbers && extData.page_numbers.length > 0
              ? extData.page_numbers
              : [1];

          if (fetchMedia) {
            try {
              const docRes = await this.authFetch(`/v1/invoices/${invoiceId}/document`);
              if (docRes.ok) {
                const contentType = docRes.headers.get('content-type') || '';
                const blob = await docRes.blob();
                const blobUrl = URL.createObjectURL(blob);
                documentUrl = blobUrl;
                if (contentType.includes('pdf')) {
                  docType = 'pdf';
                } else {
                  docType = 'image';
                }
              }
            } catch (docErr) {
              console.warn('[ApiService] Could not load source document blob:', docErr);
            }

            // Fetch page image for every page in rawPageNumbers
            for (const p of rawPageNumbers) {
              try {
                const pageImgRes = await this.authFetch(`/v1/invoices/${invoiceId}/page-image/${p}`);
                if (pageImgRes.ok) {
                  const pageBlob = await pageImgRes.blob();
                  pages.push({
                    page: p,
                    image_url: URL.createObjectURL(pageBlob),
                  });
                }
              } catch (pErr) {
                console.warn(`[ApiService] Could not load page-image/${p}:`, pErr);
              }
            }

            if (pages.length > 0) {
              pageImageUrl = pages[0].image_url;
            } else if (documentUrl && docType === 'image') {
              pageImageUrl = documentUrl;
              pages.push({ page: 1, image_url: documentUrl });
            }
          }

          const normalizedItems = (raw.line_items || []).map((item: any) => {
            const netVal = Number(item.net_amount ?? item.net_value ?? 0);
            const vatVal = Number(item.vat_amount ?? 0);
            const grossVal = Number(item.gross_amount ?? (netVal + vatVal));
            return {
              ...item,
              quantity: Number(item.quantity ?? 1),
              unit_price: Number(item.unit_price ?? netVal),
              net_value: netVal,
              net_amount: netVal,
              vat_rate: Number(item.vat_rate ?? 0),
              vat_amount: vatVal,
              gross_amount: grossVal,
              confidence: item.confidence !== undefined ? Number(item.confidence) : 0.95,
            };
          });

          return {
            ...raw,
            total_net: Number(raw.total_net ?? 0),
            total_vat: Number(raw.total_vat ?? 0),
            total_gross: Number(raw.total_gross ?? 0),
            ocr_confidence: Number(raw.ocr_confidence ?? 0.95),
            document_url: documentUrl || raw.document_url,
            document_type: docType,
            page_image_url: pageImageUrl || raw.page_image_url,
            page_count: pages.length || raw.page_count || 1,
            page_numbers: rawPageNumbers,
            pages: pages.length > 0 ? pages : (pageImageUrl ? [{ page: 1, image_url: pageImageUrl }] : []),
            line_items: normalizedItems,
            is_period_locked: Boolean(raw.is_period_locked),
            locked_year_name: raw.locked_year_name || null,
          };
        }
      } catch (err) {
        console.warn('[ApiService] Live getInvoiceDetails failed, falling back to cached mock data:', err);
      }
    }

    const invoices = this.getCachedInvoices();
    const inv = invoices.find((i) => i.id === invoiceId) || invoices[0];
    const copy = JSON.parse(JSON.stringify(inv));
    if (!copy.pages || copy.pages.length === 0) {
      if (copy.page_image_url) {
        copy.pages = [{ page: 1, image_url: copy.page_image_url }];
      }
    }
    const closedYears = (this.getMockAccountingYears(copy.organization_id) || []).filter((y) => y.is_closed);
    const lockedYear = closedYears.find((y) => copy.invoice_date >= y.start_date && copy.invoice_date <= y.end_date);
    copy.is_period_locked = Boolean(lockedYear);
    copy.locked_year_name = lockedYear ? lockedYear.name : null;
    return copy;

  }

  public async getReviewSurface(invoiceId: string): Promise<ReviewSurface> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/invoices/${invoiceId}/review`);
        if (res.ok) {
          const raw = await res.json();
          return {
            invoice_id: raw.invoice_id || invoiceId,
            page_count: raw.page_count || 1,
            pages: raw.pages || [{ page: 1, image_url: this.getUrl(`/v1/invoices/${invoiceId}/page-image/1`) }],
            boxes: raw.boxes || [],
            fields: raw.fields || [],
          };
        }
      } catch (err) {
        console.warn('[ApiService] Live getReviewSurface failed, falling back to mock surface:', err);
      }
    }

    if (MOCK_REVIEW_SURFACES[invoiceId]) {
      return MOCK_REVIEW_SURFACES[invoiceId];
    }
    // Fallback default review surface
    return MOCK_REVIEW_SURFACES['f5a2b1c0-4321-4def-9876-0fedcba98765'];
  }

  public async reocrInvoice(invoiceId: string, sectionIds: string[] = []): Promise<{ job_id: string; status: string }> {
    if (this.mode === 'live') {
      const res = await this.authFetch(`/v1/invoices/${invoiceId}/reocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_ids: sectionIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to trigger re-OCR: HTTP ${res.status}`);
      }
      return await res.json();
    }
    return { job_id: 'mock-reocr-job', status: 'processing' };
  }

  public async deleteInvoice(invoiceId?: string | null, jobId?: string | null): Promise<boolean> {
    if (this.mode === 'live') {
      try {
        const targetJobId = jobId || invoiceId;
        if (targetJobId) {
          const res = await this.authFetch(`/v1/jobs/${targetJobId}`, {
            method: 'DELETE',
          });
          if (res.ok || res.status === 204) {
            this.removeCachedInvoice(invoiceId || undefined, jobId || undefined);
            return true;
          }
        }
      } catch (err) {
        console.warn('[ApiService] Live deleteInvoice failed:', err);
      }
    }

    this.removeCachedInvoice(invoiceId || undefined, jobId || undefined);
    return true;
  }

  private removeCachedInvoice(invoiceId?: string | null, jobId?: string | null) {
    const all = this.getCachedInvoices();
    const updated = all.filter(
      (inv) =>
        (!invoiceId || (inv.id !== invoiceId && inv.job_id !== invoiceId)) &&
        (!jobId || (inv.job_id !== jobId && inv.id !== jobId))
    );
    this.setCachedInvoices(updated);
  }

  public async uploadInvoice(
    file: File,
    orgId: string,
    llmModel = 'google/gemini-3.5-flash-lite',
    industry?: string
  ): Promise<{ job_id: string; status: string; created_at: string; invoice_id?: string | null }> {
    if (this.mode === 'live') {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('organization_id', orgId);
        form.append('llm_model', llmModel);
        if (industry) {
          form.append('industry', industry);
        }

        const res = await this.authFetch('/v1/invoices', {
          method: 'POST',
          body: form,
        });
        if (res.ok) {
          return await res.json();
        }
        const errData = await res.json().catch(() => ({ detail: 'Upload request failed' }));
        console.error('[ApiService] Live upload returned error:', errData);
        throw errData;
      } catch (err: any) {
        console.warn('[ApiService] Live uploadInvoice failed:', err);
        if (err?.detail) {
          throw err;
        }
      }
    }

    // Mock upload creates simulated invoice with unique numbers derived from the file
    const jobId = 'job-' + Math.random().toString(36).substring(2, 9);
    const invoiceId = 'inv-' + Math.random().toString(36).substring(2, 9);
    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    const docUrl = URL.createObjectURL(file);
    const currentUser = this.getCurrentUser();

    // Generate unique, realistic numbers from filename/seed
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const pageMatch = nameWithoutExt.match(/(?:[-_ .]|^)(?:p|page|sheet|pg)[-_ .]?(\d+)(?:[-_ .]|$)/i);
    const pageNum = pageMatch ? parseInt(pageMatch[1], 10) : 1;
    const baseName = nameWithoutExt.replace(/(?:[-_ .]|^)(?:p|page|sheet|pg)[-_ .]?\d+(?:[-_ .]|$)/i, '').trim() || nameWithoutExt;

    const seed = Math.abs(baseName.split('').reduce((acc, char) => acc + char.charCodeAt(0) * 31, 100));
    const randomFraction = ((seed % 7919) / 7919);
    const baseNet = +(80 + randomFraction * 1420).toFixed(2);
    const vatRate = 23.0;
    const baseVat = +(baseNet * (vatRate / 100)).toFixed(2);
    const baseGross = +(baseNet + baseVat).toFixed(2);
    const cleanVendor = baseName.replace(/[_-]/g, ' ').toUpperCase().trim() || 'INDEPENDENT SUPPLIERS';
    const computedInvoiceNumber = `INV-2026-${Math.floor(100 + (seed % 899))}`;

    const currentList = this.getCachedInvoices();
    const existingIndex = currentList.findIndex(
      (inv) => inv.organization_id === orgId && inv.invoice_number === computedInvoiceNumber
    );

    if (existingIndex >= 0 && pageNum > 1) {
      // Continuation page: merge into existing invoice
      const existing = currentList[existingIndex];
      const additionalNet = +(baseNet * 0.5).toFixed(2);
      const additionalVat = +(additionalNet * (vatRate / 100)).toFixed(2);
      const additionalGross = +(additionalNet + additionalVat).toFixed(2);

      const newLineItem: LineItem = {
        id: 'item-' + Math.random().toString(36).substring(2, 7),
        description: `${cleanVendor} - Additional Items (Page ${pageNum})`,
        quantity: 2,
        unit_price: +(additionalNet / 2).toFixed(2),
        net_amount: additionalNet,
        vat_rate: 23.0,
        vat_code: 'T23',
        xero_account_code: '300',
        xero_expense_category: 'Direct Costs',
        vat_deductible: true,
        income_tax_deductible: true,
        vat_amount: additionalVat,
        gross_amount: additionalGross,
        confidence: 0.97,
        reasoning: `Extracted from continuation page ${pageNum}.`,
      };

      existing.line_items = [...(existing.line_items || []), newLineItem];
      existing.total_net = +((existing.total_net || 0) + additionalNet).toFixed(2);
      existing.total_vat = +((existing.total_vat || 0) + additionalVat).toFixed(2);
      existing.total_gross = +((existing.total_gross || 0) + additionalGross).toFixed(2);
      existing.updated_at = new Date().toISOString();

      currentList[existingIndex] = existing;
      this.setCachedInvoices(currentList);

      return {
        job_id: jobId,
        status: 'completed',
        created_at: new Date().toISOString(),
        invoice_id: existing.id,
      };
    }

    const newInvoice: InvoiceDetail = {
      id: invoiceId,
      job_id: jobId,
      tenant_id: orgId,
      organization_id: orgId,
      created_by_user_id: currentUser?.id || '3cfc8ac6-4db2-40ac-9d6d-9faa575fe77e',
      invoice_number: computedInvoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      currency: 'EUR',
      seller_name: cleanVendor,
      seller_vat: 'IE' + (1000000 + (seed % 8999999)) + 'H',
      buyer_name: 'InvParse Demo Org',
      buyer_vat: 'IE9876543K',
      total_net: baseNet,
      total_vat: baseVat,
      total_gross: baseGross,
      requires_human_review: true,
      ocr_confidence: 0.95,
      supplier_address: 'Main Street, Dublin 4, Ireland',
      document_url: docUrl,
      document_type: isPdf ? 'pdf' : 'image',
      page_image_url: isPdf ? undefined : docUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [
        {
          id: 'item-' + Math.random().toString(36).substring(2, 7),
          description: `${cleanVendor} - Extracted Commercial Goods`,
          quantity: 1,
          unit_price: baseNet,
          net_amount: baseNet,
          vat_rate: 23.0,
          vat_code: 'T23',
          xero_account_code: '300',
          xero_expense_category: 'Direct Costs',
          vat_deductible: true,
          income_tax_deductible: true,
          vat_amount: baseVat,
          gross_amount: baseGross,
          confidence: 0.96,
          reasoning: `Extracted via Visual LLM (${llmModel}) with high geometric alignment.`,
        },
      ],
    };

    this.setCachedInvoices([newInvoice, ...currentList]);

    return {
      job_id: jobId,
      status: 'completed',
      created_at: new Date().toISOString(),
      invoice_id: invoiceId,
    };
  }

  public async getJobStatus(jobId: string): Promise<JobResponse> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/jobs/${jobId}`);
        if (res.ok) {
          const raw = await res.json();
          return {
            ...raw,
            status: (raw.status || '').toLowerCase() as JobStatus,
            document_confidence: Number(raw.document_confidence ?? 0.95),
          };
        }
      } catch (err) {
        console.warn('[ApiService] Live getJobStatus failed, falling back to mock response:', err);
      }
    }

    // In mock mode, find if invoice was matched
    const invoices = this.getCachedInvoices();
    const inv = invoices.find((i) => i.job_id === jobId);

    return {
      job_id: jobId,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      invoice_id: inv ? inv.id : null,
      error_code: null,
      error_message: null,
      document_confidence: 0.96,
    };
  }

  public async getJobDocumentBlob(jobId: string): Promise<{ blobUrl: string; contentType: string; textContent?: string } | null> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/jobs/${jobId}/document`);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          let textContent: string | undefined;
          if (contentType.includes('text') || contentType.includes('json')) {
            try {
              textContent = await blob.text();
            } catch (e) {
              // ignore
            }
          }
          return { blobUrl, contentType, textContent };
        }
      } catch (err) {
        console.warn('[ApiService] Live getJobDocumentBlob failed:', err);
      }
    }
    return null;
  }

  public async submitReviewCorrections(invoiceId: string, data: Partial<InvoiceDetail>): Promise<any> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/invoices/${invoiceId}/review`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const result = await res.json();
          const invoices = this.getCachedInvoices().map((inv) =>
            inv.id === invoiceId
              ? {
                  ...inv,
                  ...data,
                  requires_human_review: data.is_draft ? true : false,
                  is_approved: data.is_draft ? false : true,
                  job_status: (data.is_draft ? 'needs_review' : 'completed') as JobStatus,
                  status: data.is_draft ? 'needs_review' : 'approved',
                  updated_at: new Date().toISOString(),
                }
              : inv
          );
          this.setCachedInvoices(invoices);
          return result;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed with status ${res.status}`);
      } catch (err: any) {
        console.error('[ApiService] Live submitReviewCorrections failed:', err);
        throw err;
      }
    }

    const invoices = this.getCachedInvoices().map((inv) =>
      inv.id === invoiceId ? { ...inv, ...data, updated_at: new Date().toISOString() } : inv
    );
    this.setCachedInvoices(invoices);

    return {
      invoice_id: invoiceId,
      status: 'reviewed',
      updated_fields: Object.keys(data),
      audit_log_id: 'audit-' + Math.random().toString(36).substring(2, 9),
    };
  }

  public async approveInvoice(invoiceId: string): Promise<{ invoice_id: string; status: string; requires_human_review: boolean }> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/invoices/${invoiceId}/review/approve`, {
          method: 'POST',
        });
        if (res.ok) {
          const result = await res.json();
          const invoices = this.getCachedInvoices().map((inv) =>
            inv.id === invoiceId
              ? {
                  ...inv,
                  requires_human_review: false,
                  is_approved: true,
                  job_status: 'completed' as JobStatus,
                  status: 'approved',
                  approved_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
              : inv
          );
          this.setCachedInvoices(invoices);
          return result;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Approval failed with status ${res.status}`);
      } catch (err: any) {
        console.error('[ApiService] Live approveInvoice failed:', err);
        throw err;
      }
    }

    const invoices = this.getCachedInvoices().map((inv) =>
      inv.id === invoiceId
        ? {
            ...inv,
            requires_human_review: false,
            is_approved: true,
            status: 'approved',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : inv
    );
    this.setCachedInvoices(invoices);

    return {
      invoice_id: invoiceId,
      status: 'approved',
      requires_human_review: false,
    };
  }

  public async unlockInvoice(invoiceId: string): Promise<{ invoice_id: string; status: string; requires_human_review: boolean }> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/invoices/${invoiceId}/review/unlock`, {
          method: 'POST',
        });
        if (res.ok) {
          const result = await res.json();
          const invoices = this.getCachedInvoices().map((inv) =>
            inv.id === invoiceId
              ? {
                  ...inv,
                  requires_human_review: true,
                  is_approved: false,
                  job_status: 'needs_review' as JobStatus,
                  status: 'needs_review',
                  approved_at: undefined,
                  updated_at: new Date().toISOString(),
                }
              : inv
          );
          this.setCachedInvoices(invoices);
          return result;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Unlock failed with status ${res.status}`);
      } catch (err: any) {
        console.error('[ApiService] Live unlockInvoice failed:', err);
        throw err;
      }
    }

    const invoices = this.getCachedInvoices().map((inv) =>
      inv.id === invoiceId
        ? {
            ...inv,
            requires_human_review: true,
            is_approved: false,
            status: 'needs_review',
            approved_at: undefined,
            updated_at: new Date().toISOString(),
          }
        : inv
    );
    this.setCachedInvoices(invoices);

    return {
      invoice_id: invoiceId,
      status: 'unlocked',
      requires_human_review: true,
    };
  }

  public async bulkUnlockInvoices(orgId: string, invoiceIds: string[]): Promise<BulkUnlockResponse> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/invoices/bulk-unlock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoice_ids: invoiceIds }),
        });
        if (res.ok) {
          const result = await res.json();
          const setIds = new Set(invoiceIds);
          const invoices = this.getCachedInvoices().map((inv) =>
            setIds.has(inv.id)
              ? {
                  ...inv,
                  requires_human_review: true,
                  is_approved: false,
                  job_status: 'needs_review' as JobStatus,
                  status: 'needs_review',
                  approved_at: undefined,
                  updated_at: new Date().toISOString(),
                }
              : inv
          );
          this.setCachedInvoices(invoices);
          return result;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Bulk unlock failed with status ${res.status}`);
      } catch (err: any) {
        console.error('[ApiService] Live bulkUnlockInvoices failed:', err);
        throw err;
      }
    }

    const setIds = new Set(invoiceIds);
    const invoices = this.getCachedInvoices().map((inv) =>
      setIds.has(inv.id)
        ? {
            ...inv,
            requires_human_review: true,
            is_approved: false,
            status: 'needs_review',
            approved_at: undefined,
            updated_at: new Date().toISOString(),
          }
        : inv
    );
    this.setCachedInvoices(invoices);

    return {
      unlocked_count: invoiceIds.length,
      invoice_ids: invoiceIds,
    };
  }

  public async assignBoxesToField(invoiceId: string, field: string, boxIds: string[]): Promise<any> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/invoices/${invoiceId}/review/correct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, box_ids: boxIds }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[ApiService] Live assignBoxesToField failed, using mock response:', err);
      }
    }

    return { success: true, field, assigned_boxes: boxIds };
  }

  // --- Suppliers ---

  public async getSuppliers(orgId: string): Promise<Supplier[]> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/suppliers`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            this.setCachedSuppliers(data);
            return data;
          }
        }
      } catch (err) {
        console.warn('[ApiService] Live getSuppliers failed, falling back to cached mock data:', err);
      }
    }
    return this.getCachedSuppliers();
  }

  public async updateSupplier(orgId: string, supplierId: string, data: Partial<Supplier>): Promise<Supplier> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/suppliers/${supplierId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          const suppliers = this.getCachedSuppliers().map((s) => (s.id === supplierId ? { ...s, ...updated } : s));
          this.setCachedSuppliers(suppliers);
          return updated;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to update supplier: ${res.status}`);
      } catch (err) {
        console.error('[ApiService] Live updateSupplier failed:', err);
        throw err;
      }
    }

    const suppliers = this.getCachedSuppliers().map((s) => (s.id === supplierId ? { ...s, ...data } : s));
    this.setCachedSuppliers(suppliers);
    return suppliers.find((s) => s.id === supplierId)!;
  }

  public async getSupplierActivity(orgId: string, supplierId: string): Promise<SupplierActivity> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/suppliers/${supplierId}/activity`);
        if (res.ok) {
          return await res.json();
        }
        console.warn(`[ApiService] Live getSupplierActivity returned ${res.status}, generating fallback from cached data.`);
      } catch (err) {
        console.warn('[ApiService] Live getSupplierActivity failed, generating fallback from cached data:', err);
      }
    }

    const supplier = this.getCachedSuppliers().find((s) => s.id === supplierId) || {
      id: supplierId,
      organization_id: orgId,
      canonical_name: 'Unknown Supplier',
      aliases: [],
      vat_number: '',
      iban: '',
      address: '',
      business_description: '',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Fallback: match any cached invoices for this supplier
    const cachedInvoices = this.getCachedInvoices();
    const matched = cachedInvoices.filter((inv) => {
      const supName = (supplier.canonical_name || '').toLowerCase().trim();
      const sName = (inv.seller_name || '').toLowerCase().trim();
      const vatA = (supplier.vat_number || '').replace(/\s+/g, '');
      const vatB = (inv.seller_vat || '').replace(/\s+/g, '');
      return (
        (supName && sName && (supName.includes(sName) || sName.includes(supName))) ||
        (vatA && vatB && vatA === vatB)
      );
    });

    const invoices: SupplierInvoice[] = matched.map((inv) => ({
      id: inv.id,
      job_id: inv.job_id || inv.id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      currency: inv.currency || 'EUR',
      total_net: inv.total_net,
      total_vat: inv.total_vat,
      total_gross: inv.total_gross,
      requires_human_review: inv.requires_human_review ?? false,
      payment_method: inv.payment_method ?? null,
      payment_status: inv.payment_status ?? null,
      amount_paid: inv.amount_paid ?? null,
      is_cash_paid: inv.is_cash_paid ?? false,
      payment_details: inv.payment_details ?? null,
      line_items: (inv.line_items || []).map((li, idx) => ({
        id: li.id || `${inv.id}-${idx}`,
        line_number: idx + 1,
        description: li.description,
        item_code: li.item_code ?? null,
        quantity: li.quantity,
        unit_price: li.unit_price,
        vat_rate: li.vat_rate,
        vat_code: li.vat_code,
        tax_amount: li.vat_amount ?? (li as any).tax_amount ?? 0,
        net_amount: li.net_amount,
        gross_amount: li.gross_amount,
        xero_account_code: li.xero_account_code,
      })),
    }));

    // In Mock mode or fallback: match bank transactions for this supplier
    const supNameLower = (supplier.canonical_name || '').toLowerCase();
    const payments: SupplierPayment[] = MOCK_BANK_TRANSACTIONS
      .filter((bt) => {
        const desc = (bt.desc || '').toLowerCase();
        return (
          (supNameLower.includes('musgrave') && desc.includes('musgrave')) ||
          (supNameLower.includes('electric') && desc.includes('electric')) ||
          (supNameLower.includes('circle') && desc.includes('circle')) ||
          (supNameLower && desc.includes(supNameLower))
        );
      })
      .map((bt) => ({
        id: bt.id,
        bank_transaction_id: bt.id,
        invoice_id: invoices[0]?.id || null,
        invoice_number: invoices[0]?.invoice_number || null,
        allocated_amount: bt.moneyOut || bt.moneyIn || 0,
        confidence_score: 0.95,
        match_method: 'auto_statement_match',
        status: 'confirmed',
        created_at: new Date().toISOString(),
        txn_date: new Date().toISOString().split('T')[0],
        txn_description: bt.desc,
        direction: bt.moneyOut ? 'debit' : 'credit',
        reference_text: bt.matchGl,
      }));

    const totalInvoiced =
      invoices.length > 0
        ? invoices.reduce((acc, i) => acc + (Number(i.total_gross) || 0), 0)
        : Number(supplier.total_invoiced) || 0;
    const totalPaid =
      payments.length > 0
        ? payments.reduce((acc, p) => acc + (Number(p.allocated_amount) || 0), 0)
        : Number(supplier.total_paid) || 0;
    const balance = totalInvoiced - totalPaid;

    return {
      supplier: {
        ...supplier,
        invoice_count: invoices.length || supplier.invoice_count || 0,
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        balance: balance,
      },
      invoices,
      payments,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      balance: balance,
    };
  }

  public async getLlmModels(): Promise<string[]> {
    if (this.mode === 'live') {
      try {
        const res = await fetch(this.getUrl('/v1/llm/models'));
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.models) && data.models.length > 0) {
            return data.models;
          }
        }
      } catch (err) {
        console.warn('[ApiService] Could not fetch live models:', err);
      }
    }
    return [
      'google/gemini-3.5-flash-lite',
      'openai/gpt-oss-20b:free',
      'nvidia/nemotron-nano-9b-v2:free',
      'google/gemma-4-26b-a4b-it:free',
      'meta-llama/llama-3.3-8b-instruct:free',
    ];
  }

  public async getIndustryPresets(): Promise<IndustryPreset[]> {
    if (this.mode === 'live') {
      try {
        const res = await fetch(this.getUrl('/v1/prompt-templates/industries'));
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return data;
          }
        }
      } catch (err) {
        console.warn('[ApiService] Could not fetch live industry presets, falling back to static presets:', err);
      }
    }
    return INDUSTRY_PRESETS;
  }

  public async listBankAccounts(orgId: string): Promise<BankAccountDto[]> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/bank-accounts`);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[ApiService] Could not fetch live bank accounts:', err);
      }
    }
    // Mock accounts
    const mockKey = `bank_accounts_${orgId}`;
    const stored = localStorage.getItem(mockKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // pass
      }
    }
    const defaultAccounts: BankAccountDto[] = [
      {
        id: `bank-acc-${orgId}-1`,
        name: 'Main Operating Account',
        bank_name: 'AIB Bank',
        account_number_last4: '4321',
        currency: 'EUR',
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(mockKey, JSON.stringify(defaultAccounts));
    return defaultAccounts;
  }

  public async createBankAccount(
    orgId: string,
    data: { name: string; bank_name: string; account_number_last4?: string; currency?: string }
  ): Promise<BankAccountDto> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/bank-accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[ApiService] Live createBankAccount failed:', err);
      }
    }
    const accounts = await this.listBankAccounts(orgId);
    const newAccount: BankAccountDto = {
      id: `bank-acc-${Date.now()}`,
      name: data.name,
      bank_name: data.bank_name,
      account_number_last4: data.account_number_last4 || '0000',
      currency: data.currency || 'EUR',
      created_at: new Date().toISOString(),
    };
    const updated = [newAccount, ...accounts];
    localStorage.setItem(`bank_accounts_${orgId}`, JSON.stringify(updated));
    return newAccount;
  }

  public async uploadBankStatement(
    file: File,
    orgId: string,
    bankAccountId: string,
    model?: string
  ): Promise<BankStatementUploadResult> {
    if (this.mode === 'live') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bank_account_id', bankAccountId);
        if (model) formData.append('model', model);

        const res = await this.authFetch(`/v1/organizations/${orgId}/bank-statements/upload`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          return await res.json();
        }
        const err = await res.json().catch(() => ({ detail: 'Bank statement upload failed' }));
        throw new Error(err.detail || 'Bank statement upload failed');
      } catch (err: any) {
        console.warn('[ApiService] Live uploadBankStatement failed:', err);
        throw err;
      }
    }

    // Mock upload simulation
    const mockStmtId = `stmt-${Date.now()}`;
    const mockResult: BankStatementUploadResult = {
      statement_id: mockStmtId,
      source_filename: file.name,
      file_hash: `hash-${Date.now()}`,
      status: 'reconciled',
      cached: false,
      transaction_count: 8,
      opening_balance: 10500.0,
      closing_balance: 9240.5,
      reconciliation: {
        passed: true,
        credits_total: 1240.5,
        debits_total: 2500.0,
      },
      matching: {
        auto_allocated: 6,
        pending_review: 2,
        unmatched: 0,
      },
    };

    const mockStatements = await this.listBankStatements(orgId);
    const newMockStatement: BankStatementDto = {
      id: mockStmtId,
      organization_id: orgId,
      bank_account_id: bankAccountId,
      source_filename: file.name,
      file_hash: mockResult.file_hash,
      uploaded_at: new Date().toISOString(),
      period_start: '01 Aug 2025',
      period_end: '31 Oct 2025',
      opening_balance: 10500.0,
      closing_balance: 9240.5,
      status: 'reconciled',
      reconciliation_details: {
        formula: 'opening + credits - debits == closing',
        discrepancy: 0.0,
        credits_total: 1240.5,
        debits_total: 2500.0,
      },
      transaction_count: 8,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(`bank_statements_${orgId}`, JSON.stringify([newMockStatement, ...mockStatements]));

    return mockResult;
  }

  public async listBankStatements(orgId: string): Promise<BankStatementDto[]> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/organizations/${orgId}/bank-statements`);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[ApiService] Could not fetch live bank statements:', err);
      }
    }
    // Mock statements from local storage or fallback
    const mockKey = `bank_statements_${orgId}`;
    const stored = localStorage.getItem(mockKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // pass
      }
    }
    return [];
  }

  public async getBankStatementTransactions(
    orgId: string,
    statementId: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<BankTransactionDto[]> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(
          `/v1/organizations/${orgId}/bank-statements/${statementId}/transactions?sort_order=${sortOrder}`
        );
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[ApiService] Could not fetch live statement transactions:', err);
      }
    }
    // Mock transactions
    const mockKey = `bank_transactions_${statementId}`;
    const stored = localStorage.getItem(mockKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // pass
      }
    }
    return [];
  }

  public async getReconciliationReviewQueue(
    orgId: string,
    filterStatus?: string
  ): Promise<ReviewQueueItemDto[]> {
    if (this.mode === 'live') {
      try {
        const url = filterStatus
          ? `/v1/organizations/${orgId}/bank-reconciliation/review-queue?filter_status=${encodeURIComponent(filterStatus)}`
          : `/v1/organizations/${orgId}/bank-reconciliation/review-queue`;
        const res = await this.authFetch(url);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[ApiService] Could not fetch live reconciliation review queue:', err);
      }
    }
    return [];
  }

  public async reviewPaymentAllocation(
    orgId: string,
    allocationId: string,
    action: 'confirm' | 'reassign' | 'reject',
    invoiceId?: string,
    supplierId?: string,
    allocatedAmount?: number
  ): Promise<PaymentAllocationDto> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(
          `/v1/organizations/${orgId}/payment-allocations/${allocationId}/review`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action,
              invoice_id: invoiceId,
              supplier_id: supplierId,
              allocated_amount: allocatedAmount,
            }),
          }
        );
        if (res.ok) {
          return await res.json();
        }
        const err = await res.json().catch(() => ({ detail: 'Review allocation failed' }));
        throw new Error(err.detail || 'Review allocation failed');
      } catch (err: any) {
        console.warn('[ApiService] Live reviewPaymentAllocation failed:', err);
        throw err;
      }
    }
    return {
      id: allocationId,
      bank_transaction_id: `tx-${Date.now()}`,
      invoice_id: invoiceId,
      supplier_id: supplierId,
      allocated_amount: allocatedAmount || 0,
      confidence_score: 1.0,
      match_method: 'manual',
      status: action === 'confirm' ? 'confirmed' : action === 'reject' ? 'rejected' : 'confirmed',
    };
  }

  public async reprocessJob(
    jobId: string,
    targetType: 'invoice' | 'bank_statement' = 'invoice'
  ): Promise<JobResponse> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(`/v1/jobs/${jobId}/reprocess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_type: targetType }),
        });
        if (res.ok) {
          const raw = await res.json();
          return {
            ...raw,
            status: (raw.status || '').toLowerCase() as JobStatus,
            document_confidence: Number(raw.document_confidence ?? 0.95),
          };
        }
        const err = await res.json().catch(() => ({ detail: 'Reprocessing failed' }));
        throw new Error(err.detail || 'Reprocessing failed');
      } catch (err: any) {
        console.warn('[ApiService] Live reprocessJob failed:', err);
        throw err;
      }
    }
    return {
      job_id: jobId,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      invoice_id: null,
      error_code: null,
      error_message: null,
      document_confidence: null,
    };
  }

  public async getDuplicateReviewQueue(orgId: string): Promise<DuplicateQueueItemDto[]> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(
          `/v1/organizations/${orgId}/bank-reconciliation/duplicate-queue`
        );
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[ApiService] Could not fetch duplicate review queue:', err);
      }
    }
    return [];
  }

  public async reviewDuplicateTransaction(
    orgId: string,
    transactionId: string,
    action: 'approve' | 'reject'
  ): Promise<DuplicateReviewResponseDto> {
    if (this.mode === 'live') {
      try {
        const res = await this.authFetch(
          `/v1/organizations/${orgId}/bank-transactions/${transactionId}/review-duplicate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          }
        );
        if (res.ok) {
          return await res.json();
        }
        const err = await res.json().catch(() => ({ detail: 'Duplicate review action failed' }));
        throw new Error(err.detail || 'Duplicate review action failed');
      } catch (err: any) {
        console.warn('[ApiService] Live reviewDuplicateTransaction failed:', err);
        throw err;
      }
    }
    return {
      transaction: {
        id: transactionId,
        statement_id: 'mock-stmt',
        row_index: 0,
        txn_date: new Date().toISOString().split('T')[0],
        description: 'Mock transaction',
        amount: 100,
        direction: 'debit',
        status: action === 'approve' ? 'imported' : 'rejected',
      },
      allocations: [],
      message: `Transaction ${action}ed successfully`,
    };
  }
}

export const apiService = new ApiService();

