import React, { useState, useEffect } from 'react';
import { Save, Globe, Database, Building, Cpu, CheckCircle2, ShieldCheck, Sparkles, Scale, Sliders } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Organization, IndustryCode, IndustryPreset, INDUSTRY_PRESETS } from '../../types/api';
import { apiService } from '../../services/api';
import { CoaView } from './CoaView';
import { AccountingYearsView } from './AccountingYearsView';


interface SettingsViewProps {
  activeOrg: Organization;
  onUpdateOrg: (updated: Partial<Organization>) => void;
  mode: 'mock' | 'live';
  onToggleMode: () => void;
  onShowToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeOrg,
  onUpdateOrg,
  mode,
  onToggleMode,
  onShowToast,
}) => {
  const [orgName, setOrgName] = useState<string>(activeOrg.name);
  const [industry, setIndustry] = useState<IndustryCode>(activeOrg.industry || 'general');
  const [customNotes, setCustomNotes] = useState<string>(activeOrg.custom_accounting_notes || '');
  const [apiUrl, setApiUrl] = useState<string>(() => apiService.getApiBaseUrl());
  const [presets, setPresets] = useState<IndustryPreset[]>(INDUSTRY_PRESETS);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Capitalization threshold state
  const [hasCustomThreshold, setHasCustomThreshold] = useState<boolean>(
    activeOrg.capitalization_threshold !== null && activeOrg.capitalization_threshold !== undefined
  );
  const [thresholdInput, setThresholdInput] = useState<string>(
    activeOrg.capitalization_threshold !== null && activeOrg.capitalization_threshold !== undefined
      ? String(activeOrg.capitalization_threshold)
      : '500.00'
  );

  // Provider Admin system default state
  const [providerDefaultThreshold, setProviderDefaultThreshold] = useState<number>(500);
  const [providerInput, setProviderInput] = useState<string>('500.00');
  const [isSavingProvider, setIsSavingProvider] = useState<boolean>(false);

  const currentUser = apiService.getCurrentUser();
  const isProviderAdmin =
    currentUser?.side === 'provider' ||
    currentUser?.tier === 'super_admin' ||
    activeOrg.org_type === 'provider';
  const isOrgAdmin =
    isProviderAdmin ||
    currentUser?.role === 'admin' ||
    currentUser?.tier === 'super_admin';


  // Managing practice if client org
  const cachedOrgs = apiService.getCachedOrgs();
  const managingPractice = activeOrg.managing_org_id
    ? cachedOrgs.find((o) => o.id === activeOrg.managing_org_id)
    : null;
  const practiceThreshold = managingPractice?.capitalization_threshold;
  const effectiveInheritedThreshold =
    practiceThreshold !== null && practiceThreshold !== undefined
      ? practiceThreshold
      : providerDefaultThreshold;

  useEffect(() => {
    setOrgName(activeOrg.name);
    setIndustry(activeOrg.industry || 'general');
    setCustomNotes(activeOrg.custom_accounting_notes || '');
    setHasCustomThreshold(
      activeOrg.capitalization_threshold !== null && activeOrg.capitalization_threshold !== undefined
    );
    if (
      activeOrg.capitalization_threshold !== null &&
      activeOrg.capitalization_threshold !== undefined
    ) {
      setThresholdInput(String(activeOrg.capitalization_threshold));
    }
  }, [activeOrg]);

  useEffect(() => {
    apiService.getIndustryPresets().then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setPresets(res);
      }
    });

    apiService.getProviderSettings().then((res) => {
      if (res && res.default_capitalization_threshold !== undefined) {
        setProviderDefaultThreshold(res.default_capitalization_threshold);
        setProviderInput(String(res.default_capitalization_threshold));
      }
    });
  }, []);

  const selectedPreset = presets.find((p) => p.industry_code === industry) || presets[0];

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const thresholdToSave =
      hasCustomThreshold && thresholdInput.trim() !== ''
        ? parseFloat(thresholdInput) || 500
        : null;

    try {
      await apiService.updateOrganization(activeOrg.id, {
        name: orgName,
        industry,
        custom_accounting_notes: customNotes,
        capitalization_threshold: thresholdToSave,
      });
      onUpdateOrg({
        name: orgName,
        industry,
        custom_accounting_notes: customNotes,
        capitalization_threshold: thresholdToSave,
      });
      const thresholdDesc =
        thresholdToSave !== null
          ? `Custom: €${thresholdToSave.toFixed(2)}`
          : `Inherited: €${effectiveInheritedThreshold.toFixed(2)}`;
      onShowToast(`Settings saved! Capitalization threshold: ${thresholdDesc}.`);
    } catch (err) {
      console.error(err);
      onShowToast('Failed to update organization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProviderDefault = async () => {
    setIsSavingProvider(true);
    try {
      const val = parseFloat(providerInput) || 500;
      await apiService.updateProviderSettings({ default_capitalization_threshold: val });
      setProviderDefaultThreshold(val);
      onShowToast(`Platform default capitalization threshold set to €${val.toFixed(2)}`);
    } catch (err) {
      console.error(err);
      onShowToast('Failed to update provider platform settings');
    } finally {
      setIsSavingProvider(false);
    }
  };

  const handleSaveApiBase = () => {
    apiService.setApiBaseUrl(apiUrl);
    onShowToast(`Live Backend API base URL set to: ${apiUrl}`);
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col bg-background gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
          System & Organization Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Configure API connection mode, industry prompt injection rules, and client business rules.
        </p>
      </div>

      {/* Mode & Backend Connectivity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> API Connectivity & Mode
          </CardTitle>
          <span className="text-xs font-mono font-bold text-primary capitalize">{mode} Mode</span>
        </CardHeader>
        <CardBody className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
            <div>
              <span className="font-bold text-foreground block">Active Execution Environment</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {mode === 'mock'
                  ? 'Currently running with client-side in-memory mock database for zero-dependency operation.'
                  : 'Currently communicating directly with live FastAPI backend endpoints.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onToggleMode} className="gap-1.5 text-xs font-semibold cursor-pointer">
              {mode === 'mock' ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-emerald-500" /> Switch to Live API
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-amber-500" /> Switch to Mock Store
                </>
              )}
            </Button>
          </div>

          <div>
            <label className="font-bold text-foreground block mb-1">FastAPI Backend Base URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="Leave empty for Vite Dev Proxy (/v1 -> http://localhost:8000)"
                className="flex-1 p-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:border-primary"
              />
              <Button variant="secondary" size="sm" onClick={handleSaveApiBase} className="h-9 cursor-pointer">
                Save URL
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Tip: Leave empty for local development to route via Vite proxy and avoid browser CORS restrictions.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Provider Admin Global System Defaults */}
      {isProviderAdmin && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <Sliders className="w-4 h-4" /> Platform Provider Admin: Global Default Policy
            </CardTitle>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Provider Scope
            </span>
          </CardHeader>
          <CardBody className="space-y-4 text-xs">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              As a Provider Administrator, you can configure the system-wide default capitalization threshold. This value serves as the fallback for all practices and client companies across the entire platform that do not specify an override.
            </p>
            <div className="flex items-center gap-3">
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground font-bold text-xs">
                  €
                </span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={providerInput}
                  onChange={(e) => setProviderInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isSavingProvider}
                onClick={handleSaveProviderDefault}
                className="gap-1.5 text-xs font-bold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingProvider ? 'Updating...' : 'Save Global Default'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Organization Details & Industry Profile Prompt Injection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" /> Active Business Scope: {activeOrg.name}
          </CardTitle>
          <span className="text-xs text-muted-foreground capitalize font-semibold">{activeOrg.org_type}</span>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSaveOrg} className="space-y-5 text-xs">
            <div>
              <label className="font-bold text-foreground block mb-1">Company / Practice Legal Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Industry Profile Selection */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="settings-industry-select" className="font-bold text-foreground flex items-center gap-2 text-sm">
                  <Cpu className="w-4 h-4 text-sky-500" />
                  <span>Industry Profile (Injected System Prompt Rules)</span>
                </label>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Active Profile
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Selecting the organization's industry injects domain-specific accounting &amp; VAT rules into the LLM system prompt for all document extractions.
              </p>

              <div>
                <select
                  id="settings-industry-select"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as IndustryCode)}
                  className="w-full p-2.5 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  {presets.map((p) => (
                    <option key={p.industry_code} value={p.industry_code}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Injected Prompt Rules Preview */}
              {selectedPreset && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-card border-2 border-primary/40 shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-border/80 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span>Injected LLM Extraction Rules — {selectedPreset.display_name.split('(')[0].trim()}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">
                      Active Prompt Block
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/80 border border-border">
                    <p className="text-xs leading-relaxed font-mono text-foreground font-medium selection:bg-primary/20">
                      {selectedPreset.industry_rules}
                    </p>
                  </div>
                </div>
              )}

              {industry === 'retail_wholesale' && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-[11px]">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong>Section 60(2)(a)(i) Protection:</strong> Grocery &amp; retail inventory stock will be classified as <strong>Xero 300 (Purchases)</strong> with <strong>100% deductible input VAT</strong>, preventing accidental non-deductible Entertainment (413) coding.
                  </span>
                </div>
              )}
            </div>

            {/* Asset Capitalization Policy (De Minimis Threshold) */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground flex items-center gap-2 text-sm">
                  <Scale className="w-4 h-4 text-emerald-500" />
                  <span>Asset Capitalization Policy (De Minimis Threshold)</span>
                </label>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {hasCustomThreshold
                    ? `Custom: €${parseFloat(thresholdInput || '0').toFixed(2)}`
                    : managingPractice
                    ? `Practice Default: €${effectiveInheritedThreshold.toFixed(2)}`
                    : `Platform Default: €${effectiveInheritedThreshold.toFixed(2)}`}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Purchases of capital equipment, IT hardware, furniture, and machinery with net amount below this threshold are expensed immediately as <strong>Operating Expenses</strong> (e.g. <code>420 Office Supplies</code> or <code>425 Repairs &amp; Maintenance</code>) rather than capitalized to <strong>Fixed Assets</strong> (<code>710/720/764</code>).
              </p>

              {activeOrg.org_type === 'accounting' && (
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-800 dark:text-sky-300 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    <strong>Accounting Practice Scope:</strong> This threshold serves as the default policy for all client companies managed by your firm that do not define an individual override.
                  </span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="radio"
                    name="cap_threshold_mode"
                    checked={!hasCustomThreshold}
                    onChange={() => setHasCustomThreshold(false)}
                    className="accent-primary w-4 h-4"
                  />
                  <span>
                    Inherit {managingPractice ? `from managing practice (${managingPractice.name})` : 'platform default'} policy
                    <strong className="ml-1.5 font-mono text-primary font-bold">
                      (€{effectiveInheritedThreshold.toFixed(2)})
                    </strong>
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="radio"
                    name="cap_threshold_mode"
                    checked={hasCustomThreshold}
                    onChange={() => setHasCustomThreshold(true)}
                    className="accent-primary w-4 h-4"
                  />
                  <span>
                    Define custom capitalization threshold for <strong>{activeOrg.name}</strong>
                  </span>
                </label>
              </div>

              {hasCustomThreshold && (
                <div className="pl-6 pt-1 space-y-1.5">
                  <label className="font-bold text-foreground block text-[11px]">
                    Custom Threshold Amount (€ Net Cost)
                  </label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground font-bold text-xs">
                        €
                      </span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={thresholdInput}
                        onChange={(e) => setThresholdInput(e.target.value)}
                        placeholder="500.00"
                        className="w-full pl-7 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">EUR</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Items &lt; €{parseFloat(thresholdInput || '0').toFixed(2)} net will be expensed to Operating Expenses. Items ≥ €{parseFloat(thresholdInput || '0').toFixed(2)} will be capitalized as Fixed Assets.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">
                Custom Accounting Notes &amp; GL Context (Section 3.3)
              </label>
              <textarea
                rows={4}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Grocery retail shop. All food, beverage, and consumable inventory items are goods for resale (stock in trade, Xero 300 Purchases) and are 100% VAT-deductible under Section 60(2) VATCA 2010..."
                className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                These notes are injected into visual LLM prompt contexts to instruct the model on custom supplier coding for this organization.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" type="submit" disabled={isSaving} className="gap-1.5 font-bold cursor-pointer px-4">
                <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving…' : 'Save Organization & Industry Rules'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Organization Accounting Years & Period Locking */}
      <AccountingYearsView
        orgId={activeOrg.id}
        orgName={activeOrg.name}
        isAdmin={Boolean(isOrgAdmin)}
        onShowToast={onShowToast}
      />

      {/* Organization Chart of Accounts (GL Codes) */}
      <CoaView embedded orgId={activeOrg.id} industry={activeOrg.industry} />

    </div>
  );
};
