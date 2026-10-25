import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { TrialBalanceReport, GlCategory } from '../../../lib/financialEngine';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../ui/Button';
import { InvoiceGroupedTransactions } from './InvoiceGroupedTransactions';

interface TrialBalanceTableProps {
  report: TrialBalanceReport;
  onSelectInvoice?: (invoiceId: string) => void;
}

export const TrialBalanceTable: React.FC<TrialBalanceTableProps> = ({
  report,
  onSelectInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'net' | 'gross'>('net');

  const toggleExpand = (code: string) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    for (const acc of report.accounts) {
      if (acc.transactions.length > 0) {
        allExpanded[acc.code] = true;
      }
    }
    setExpandedAccounts(allExpanded);
  };

  const collapseAll = () => {
    setExpandedAccounts({});
  };

  const filteredAccounts = report.accounts.filter((acc) => {
    const matchesSearch =
      acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      acc.category === selectedCategory ||
      (selectedCategory === 'Current Assets' && acc.category === 'Current Asset') ||
      (selectedCategory === 'Current Liabilities' && acc.category === 'Current Liability');
    return matchesSearch && matchesCategory;
  });

  const categories: GlCategory[] = [
    'Revenue',
    'Direct Costs',
    'Operating Expense',
    'Current Assets',
    'Fixed Assets',
    'Current Liabilities',
    'Non-Current Liability',
    'Equity',
  ];

  return (
    <div className="space-y-4">
      {/* Top Balancing Status Bar */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          report.isBalanced
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
              report.isBalanced
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-rose-500 text-white shadow-xs'
            }`}
          >
            {report.isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">
                {report.isBalanced
                  ? 'Double-Entry Trial Balance: Balanced'
                  : 'Double-Entry Trial Balance: Out of Balance'}
              </h3>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  report.isBalanced
                    ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-500/20 text-rose-800 dark:text-rose-300'
                }`}
              >
                Variance: {formatCurrency(report.variance)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Strict general ledger posting: line expenses debited to GL codes, deductible VAT debited to 820, full gross credited to 800 Trade Payables.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-sans">
              Total Debits {viewMode === 'net' ? '(Net)' : '(Gross)'}
            </span>
            <span className="font-bold text-sm text-foreground">
              {formatCurrency(viewMode === 'net' ? (report.totalNetDebits ?? report.totalDebits) : report.totalDebits)}
            </span>
          </div>
          <div className="h-7 w-px bg-border hidden md:block" />
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-sans">
              Total Credits {viewMode === 'net' ? '(Net)' : '(Gross)'}
            </span>
            <span className="font-bold text-sm text-foreground">
              {formatCurrency(viewMode === 'net' ? (report.totalNetCredits ?? report.totalCredits) : report.totalCredits)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by GL code or account name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Net Balances vs Gross Movements Toggle */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('net')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'net'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Net Balances
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gross')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'gross'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Gross Movements
            </button>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Trial Balance Main Ledger Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center"></th>
                <th className="py-3 px-3 w-24">GL Code</th>
                <th className="py-3 px-4">Account Title</th>
                <th className="py-3 px-3">Classification</th>
                <th className="py-3 px-3 text-center">Txs</th>
                <th className="py-3 px-4 text-right">{viewMode === 'net' ? 'Net Debit (€)' : 'Debit (€)'}</th>
                <th className="py-3 px-4 text-right">{viewMode === 'net' ? 'Net Credit (€)' : 'Credit (€)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No general ledger accounts found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const isExpanded = Boolean(expandedAccounts[acc.code]);
                  const hasTransactions = acc.transactions.length > 0;
                  const debitAmount = viewMode === 'net' ? acc.netDebit : acc.totalDebit;
                  const creditAmount = viewMode === 'net' ? acc.netCredit : acc.totalCredit;

                  return (
                    <React.Fragment key={acc.code}>
                      {/* Account Summary Row */}
                      <tr
                        onClick={() => hasTransactions && toggleExpand(acc.code)}
                        className={`group transition-colors ${
                          hasTransactions ? 'cursor-pointer hover:bg-muted/40' : ''
                        } ${isExpanded ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          {hasTransactions && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(acc.code);
                              }}
                              className="size-5 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-transform"
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4 text-primary" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-primary">
                          {acc.code}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{acc.name}</span>
                            {acc.code === '300' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-normal">
                                S.60 Resale
                              </span>
                            )}
                            {acc.code === '820' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-500/15 text-blue-700 dark:text-blue-300 font-normal">
                                Input Tax
                              </span>
                            )}
                            {acc.code === '800' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-300 font-normal">
                                Creditors
                              </span>
                            )}
                            {acc.code === '999' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-rose-500/15 text-rose-700 dark:text-rose-300 font-normal">
                                Extraction & Rounding Variance
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60">
                            {acc.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {hasTransactions ? (
                            <span
                              className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px]"
                              title={`${new Set(acc.transactions.map((t) => t.invoiceId || t.invoiceNumber || t.id)).size} invoices (${acc.transactionCount} items)`}
                            >
                              {new Set(acc.transactions.map((t) => t.invoiceId || t.invoiceNumber || t.id)).size !== acc.transactionCount
                                ? `${new Set(acc.transactions.map((t) => t.invoiceId || t.invoiceNumber || t.id)).size} inv (${acc.transactionCount})`
                                : acc.transactionCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">
                          {debitAmount > 0 ? (
                            <span className="text-foreground">{formatCurrency(debitAmount)}</span>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">
                          {creditAmount > 0 ? (
                            <span className="text-foreground">{formatCurrency(creditAmount)}</span>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Drill-down Nested Transactions Panel */}
                      {isExpanded && (
                        <tr className="bg-muted/20 border-b border-border/70">
                          <td colSpan={7} className="p-0">
                            <div className="px-6 py-4 bg-muted/15 border-y border-border/50">
                              <InvoiceGroupedTransactions
                                transactions={acc.transactions}
                                accountCode={acc.code}
                                accountName={acc.name}
                                viewMode="tb"
                                onSelectInvoice={onSelectInvoice}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Totals and Balance Check */}
            <tfoot>
              <tr className="bg-muted/70 border-t-2 border-border font-bold text-xs text-foreground">
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3 font-mono">TOTAL</td>
                <td className="py-3 px-4">
                  {viewMode === 'net' ? 'Total Net Debits & Net Credits' : 'Total Debits & Total Credits'}
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                      report.isBalanced
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-500/20 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {report.isBalanced ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Balanced
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        Out of Balance
                      </>
                    )}
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-mono">
                  {report.accounts.reduce((s, a) => s + a.transactionCount, 0)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-foreground">
                  {formatCurrency(viewMode === 'net' ? (report.totalNetDebits ?? report.totalDebits) : report.totalDebits)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm text-foreground">
                  {formatCurrency(viewMode === 'net' ? (report.totalNetCredits ?? report.totalCredits) : report.totalCredits)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
