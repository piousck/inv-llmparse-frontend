import React, { useState, useEffect } from 'react';
import {
  Scale,
  Layers,
  TrendingUp,
  Download,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { InvoiceDetail } from '../../types/api';
import { apiService } from '../../services/api';
import { MOCK_SALES_ITEMS } from '../../services/mockData';
import {
  deriveFinancialStatements,
  FinancialStatementsResult,
  exportTrialBalanceCsv,
  exportFormattedTbCsv,
  exportPnlCsv,
  isInvoiceApproved,
} from '../../lib/financialEngine';
import { formatCurrency } from '../../lib/utils';
import { TrialBalanceTable } from './financials/TrialBalanceTable';
import { FormattedTrialBalance } from './financials/FormattedTrialBalance';
import { ProfitAndLossStatement } from './financials/ProfitAndLossStatement';
import { Button } from '../ui/Button';

export type FinancialSubTab = 'trial-balance' | 'formatted-tb' | 'pnl';

interface FinancialStatementsViewProps {
  activeOrgId: string;
  onSelectInvoice?: (invoiceId: string) => void;
  onNavigateToInvoices?: () => void;
  onShowToast: (msg: string) => void;
  activeSubTab?: FinancialSubTab;
  onChangeSubTab?: (subTab: FinancialSubTab) => void;
}

export const FinancialStatementsView: React.FC<FinancialStatementsViewProps> = ({
  activeOrgId,
  onSelectInvoice,
  onNavigateToInvoices,
  onShowToast,
  activeSubTab = 'trial-balance',
  onChangeSubTab,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<FinancialSubTab>(activeSubTab);
  const [allOrgInvoices, setAllOrgInvoices] = useState<InvoiceDetail[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [includeSales, setIncludeSales] = useState<boolean>(false);
  const [activeOrgName, setActiveOrgName] = useState<string>('');

  // Sync internal state if parent passes controlled activeSubTab
  useEffect(() => {
    if (activeSubTab) {
      setInternalSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleSubTabChange = (tab: FinancialSubTab) => {
    setInternalSubTab(tab);
    if (onChangeSubTab) {
      onChangeSubTab(tab);
    }
  };

  useEffect(() => {
    loadInvoices();
    apiService.getOrganizations().then((orgs) => {
      const found = orgs.find((o) => o.id === activeOrgId);
      if (found) setActiveOrgName(found.name);
    });
  }, [activeOrgId]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      // Load all org invoices to compute approved vs pending review breakdown
      const all = await apiService.getReportingInvoices(activeOrgId, false);
      setAllOrgInvoices(all);
      // Strictly enforce ledger boundary: only approved invoices enter financial calculation
      const approved = all.filter(isInvoiceApproved);
      setInvoices(approved);
    } catch (err) {
      console.error('[FinancialStatementsView] Failed to load invoices for statements:', err);
      onShowToast('Error loading invoices for financial calculation');
    } finally {
      setLoading(false);
    }
  };

  // Derive reports dynamically in real time
  const financialData: FinancialStatementsResult = deriveFinancialStatements(
    invoices,
    includeSales ? MOCK_SALES_ITEMS : []
  );

  const { trialBalance, formattedTb, pnl, invoiceCount, totalGrossVolume } = financialData;

  const pendingCount = allOrgInvoices.length - invoiceCount;
  const pendingGross = allOrgInvoices
    .filter((inv) => !isInvoiceApproved(inv))
    .reduce((sum, inv) => sum + Number(inv.total_gross || 0), 0);

  const handleExportCsv = () => {
    if (internalSubTab === 'trial-balance') {
      exportTrialBalanceCsv(trialBalance, 'Apex Accounting');
      onShowToast('Exported Trial Balance (CSV)');
    } else if (internalSubTab === 'formatted-tb') {
      exportFormattedTbCsv(formattedTb, pnl, activeOrgName || 'Apex Accounting');
      onShowToast('Exported Formatted Trial Balance (CSV)');
    } else {
      exportPnlCsv(pnl, 'Apex Accounting');
      onShowToast('Exported Profit & Loss Statement (CSV)');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col bg-background gap-5">
      {/* Header with Title & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
              Financial Statements
            </h1>
            {activeOrgName && (
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium flex items-center gap-1.5 border border-border">
                <Building2 className="size-3 text-primary" />
                {activeOrgName}
              </span>
            )}
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Approved Invoices Only
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Derived strictly from <strong>{invoiceCount} approved</strong> vendor {invoiceCount === 1 ? 'invoice' : 'invoices'} ({formatCurrency(totalGrossVolume)} gross)
            {includeSales ? ` and ${MOCK_SALES_ITEMS.length} sales batches` : ''} for {activeOrgName || 'selected entity'} with full drill-down.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSales}
              onChange={(e) => setIncludeSales(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary/20"
            />
            <span>Include Sales Invoices</span>
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={loadInvoices}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1.5 text-xs font-semibold hidden sm:flex"
          >
            <Printer className="size-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Excluded Unapproved Invoices Info Banner */}
      {!loading && pendingCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{pendingCount} unapproved {pendingCount === 1 ? 'document' : 'documents'} ({formatCurrency(pendingGross)})</strong>{' '}
              {pendingCount === 1 ? 'is' : 'are'} pending human review and strictly excluded from financial statements.
            </span>
          </div>
          {onNavigateToInvoices && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToInvoices}
              className="h-7 text-xs border-amber-500/30 hover:bg-amber-500/20 text-amber-950 dark:text-amber-100 font-bold shrink-0 self-start sm:self-auto"
            >
              Review & Approve ({pendingCount})
            </Button>
          )}
        </div>
      )}

      {/* Sub-Tabs Switcher */}
      <div className="flex items-center border-b border-border gap-1 overflow-x-auto">
        <button
          onClick={() => handleSubTabChange('trial-balance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            internalSubTab === 'trial-balance'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Scale className="size-4" />
          <span>Trial Balance</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono text-muted-foreground">
            {trialBalance.accounts.length}
          </span>
        </button>

        <button
          onClick={() => handleSubTabChange('formatted-tb')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            internalSubTab === 'formatted-tb'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Layers className="size-4" />
          <span>Formatted Trial Balance</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono text-muted-foreground">
            {formattedTb.length} groups
          </span>
        </button>

        <button
          onClick={() => handleSubTabChange('pnl')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            internalSubTab === 'pnl'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <TrendingUp className="size-4" />
          <span>Profit & Loss</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono">
            {pnl.grossMarginPercent}%
          </span>
        </button>
      </div>

      {/* Main Sub-view Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <RefreshCw className="size-6 animate-spin text-primary" />
          <p className="text-xs">Aggregating parsed invoice ledger journals...</p>
        </div>
      ) : invoiceCount === 0 && !includeSales ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border border-border shadow-xs my-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Scale className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Approved Invoices in Ledger</h3>
          <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4 leading-relaxed">
            Financial statements strictly require purchase invoices to be reviewed and approved before posting to the general ledger.
            {allOrgInvoices.length > 0
              ? ` All ${allOrgInvoices.length} uploaded ${allOrgInvoices.length === 1 ? 'invoice is' : 'invoices are'} currently pending review.`
              : ' Upload and approve invoices to generate real-time financial statements.'}
          </p>
          {onNavigateToInvoices && (
            <Button variant="primary" size="sm" onClick={onNavigateToInvoices} className="gap-1.5 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Open Purchase Invoices to Approve
            </Button>
          )}
        </div>
      ) : (
        <>
          {internalSubTab === 'trial-balance' && (
            <TrialBalanceTable
              report={trialBalance}
              onSelectInvoice={onSelectInvoice}
            />
          )}

          {internalSubTab === 'formatted-tb' && (
            <FormattedTrialBalance
              groups={formattedTb}
              isBalanced={trialBalance.isBalanced}
              variance={trialBalance.variance}
              pnl={pnl}
              onSelectInvoice={onSelectInvoice}
            />
          )}

          {internalSubTab === 'pnl' && (
            <ProfitAndLossStatement
              pnl={pnl}
              onSelectInvoice={onSelectInvoice}
            />
          )}
        </>
      )}
    </div>
  );
};
