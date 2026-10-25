import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  FormattedCategoryGroup,
  ProfitAndLossReport,
} from '../../../lib/financialEngine';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../ui/Button';
import { InvoiceGroupedTransactions } from './InvoiceGroupedTransactions';

interface FormattedTrialBalanceProps {
  groups: FormattedCategoryGroup[];
  isBalanced?: boolean;
  variance: number;
  pnl?: ProfitAndLossReport;
  onSelectInvoice?: (invoiceId: string) => void;
}

export const FormattedTrialBalance: React.FC<FormattedTrialBalanceProps> = ({
  groups,
  variance,
  pnl,
  onSelectInvoice,
}) => {
  // State for which categories are expanded (default: all expanded)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) {
      init[g.id] = true;
    }
    return init;
  });

  // State for which specific accounts have drill-down transactions open
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleAccount = (code: string) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const expandAll = () => {
    const allGroups: Record<string, boolean> = {};
    const allAccounts: Record<string, boolean> = {};
    for (const g of groups) {
      allGroups[g.id] = true;
      for (const a of g.accounts) {
        if (a.transactions.length > 0) {
          allAccounts[a.code] = true;
        }
      }
    }
    setExpandedGroups(allGroups);
    setExpandedAccounts(allAccounts);
  };

  const collapseAll = () => {
    setExpandedAccounts({});
  };

  // Grand totals across all groups
  const grandDebit = groups.reduce((s, g) => s + g.subtotalDebit, 0);
  const grandCredit = groups.reduce((s, g) => s + g.subtotalCredit, 0);

  // Derived P&L / Operating Performance figures
  const turnoverTotal =
    pnl?.turnover?.total ??
    groups.find((g) => g.category === 'Revenue')?.subtotalCredit ??
    0;
  const costOfSalesTotal =
    pnl?.costOfSales?.total ??
    groups.find((g) => g.category === 'Direct Costs')?.subtotalDebit ??
    0;
  const grossProfit =
    pnl?.grossProfit ??
    Math.round((turnoverTotal - costOfSalesTotal) * 100) / 100;
  const operatingExpensesTotal =
    pnl?.operatingExpenses?.total ??
    groups.find((g) => g.category === 'Operating Expense')?.subtotalDebit ??
    0;
  const netProfit =
    pnl?.netProfit ??
    Math.round((grossProfit - operatingExpensesTotal) * 100) / 100;

  return (
    <div className="space-y-6">
      {/* Category Navigation Strip & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            <Layers className="size-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">
              Categorized Financial Structure
            </h3>
            <p className="text-xs text-muted-foreground">
              Standard FRS 102 / Irish GAAP accounting classifications with drill-down to contributing bills.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Expand All Drill-downs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Collapse Drill-downs
          </Button>
        </div>
      </div>

      {/* Operating Performance & Net Profit / (Loss) Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border p-3.5 rounded-xl shadow-2xs">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
            Turnover (Revenue)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base font-bold font-mono text-foreground">
              {formatCurrency(turnoverTotal)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">Credits (2xx)</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
            Cost of Sales (COGS)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base font-bold font-mono text-foreground">
              {formatCurrency(costOfSalesTotal)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">Debits (3xx)</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
            Operating Overheads
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base font-bold font-mono text-foreground">
              {formatCurrency(operatingExpensesTotal)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">Debits (4xx)</span>
          </div>
        </div>

        <div
          className={`p-3 rounded-lg border transition-all ${
            netProfit >= 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider block">
              {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                netProfit >= 0
                  ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/20 text-rose-800 dark:text-rose-300'
              }`}
            >
              {netProfit >= 0 ? (
                <>
                  <TrendingUp className="size-3" /> Profit
                </>
              ) : (
                <>
                  <TrendingDown className="size-3" /> Loss
                </>
              )}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-base font-bold font-mono ${
                netProfit >= 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {formatCurrency(netProfit)}
            </span>
            <span className="text-[10px] opacity-80 font-mono">
              {turnoverTotal > 0
                ? `${((netProfit / turnoverTotal) * 100).toFixed(1)}% margin`
                : 'Current Period'}
            </span>
          </div>
        </div>
      </div>

      {/* Category Groups List */}
      <div className="space-y-4">
        {groups.map((group) => {
          const isGroupOpen = expandedGroups[group.id] ?? true;
          const hasAccounts = group.accounts.length > 0;

          return (
            <React.Fragment key={group.id}>
              <div
                className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs transition-all"
              >
              {/* Group Header Bar */}
              <div
                onClick={() => toggleGroup(group.id)}
                className="p-4 bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/70"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="size-6 rounded-md bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-transform"
                  >
                    {isGroupOpen ? (
                      <ChevronDown className="size-4 text-primary" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>

                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-foreground">
                      {group.name}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                      {group.codeRange}
                    </span>
                    {group.percentageOfTotal > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {group.percentageOfTotal}% of Overheads
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtotals in Header */}
                <div className="flex items-center gap-6 text-xs font-mono self-end md:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-sans text-muted-foreground block">
                      Subtotal Debits
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(group.subtotalDebit)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-sans text-muted-foreground block">
                      Subtotal Credits
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(group.subtotalCredit)}
                    </span>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <span className="text-[10px] uppercase font-sans text-muted-foreground block">
                      Net Group Balance
                    </span>
                    <span
                      className={`font-bold text-sm ${
                        group.netBalance > 0
                          ? 'text-primary'
                          : group.netBalance < 0
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatCurrency(Math.abs(group.netBalance))}{' '}
                      <span className="text-[10px] font-normal font-sans">
                        {group.netBalance >= 0 ? 'Dr' : 'Cr'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Group Body: Accounts Table */}
              {isGroupOpen && (
                <div className="overflow-x-auto">
                  {!hasAccounts ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No invoices currently posted to this account category.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/20 border-b border-border/50 text-[10px] uppercase font-semibold text-muted-foreground">
                          <th className="py-2.5 px-3 w-10 text-center"></th>
                          <th className="py-2.5 px-3 w-20">GL Code</th>
                          <th className="py-2.5 px-4">Account Title</th>
                          <th className="py-2.5 px-3 text-center">Txs</th>
                          <th className="py-2.5 px-4 text-right">Debit (€)</th>
                          <th className="py-2.5 px-4 text-right">Credit (€)</th>
                          <th className="py-2.5 px-4 text-right">Net Position</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {group.accounts.map((acc) => {
                          const isAccExpanded = Boolean(expandedAccounts[acc.code]);
                          const hasTxs = acc.transactions.length > 0;
                          const net = acc.totalDebit - acc.totalCredit;

                          return (
                            <React.Fragment key={acc.code}>
                              <tr
                                onClick={() => hasTxs && toggleAccount(acc.code)}
                                className={`transition-colors ${
                                  hasTxs ? 'cursor-pointer hover:bg-muted/30' : ''
                                } ${isAccExpanded ? 'bg-primary/5' : ''}`}
                              >
                                <td className="py-2 px-3 text-center">
                                  {hasTxs && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleAccount(acc.code);
                                      }}
                                      className="size-5 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                                    >
                                      {isAccExpanded ? (
                                        <ChevronDown className="size-3.5 text-primary" />
                                      ) : (
                                        <ChevronRight className="size-3.5" />
                                      )}
                                    </button>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-primary">
                                  {acc.code}
                                </td>
                                <td className="py-2 px-4 font-medium text-foreground">
                                  <div className="flex items-center gap-2">
                                    <span>{acc.name}</span>
                                    {acc.code === '300' && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                        Section 60(2) Resale
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center font-mono">
                                  {hasTxs ? (
                                    <span
                                      className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]"
                                      title={`${new Set(acc.transactions.map((t) => t.invoiceId || t.invoiceNumber || t.id)).size} invoices (${acc.transactionCount} items)`}
                                    >
                                      {new Set(acc.transactions.map((t) => t.invoiceId || t.invoiceNumber || t.id)).size !== acc.transactionCount
                                        ? `${new Set(acc.transactions.map((t) => t.invoiceId || t.invoiceNumber || t.id)).size} inv (${acc.transactionCount})`
                                        : acc.transactionCount}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-4 text-right font-mono">
                                  {acc.totalDebit > 0 ? (
                                    formatCurrency(acc.totalDebit)
                                  ) : (
                                    <span className="text-muted-foreground/50">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-4 text-right font-mono">
                                  {acc.totalCredit > 0 ? (
                                    formatCurrency(acc.totalCredit)
                                  ) : (
                                    <span className="text-muted-foreground/50">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-4 text-right font-mono font-semibold">
                                  <span
                                    className={
                                      net > 0
                                        ? 'text-foreground'
                                        : net < 0
                                        ? 'text-purple-600 dark:text-purple-400'
                                        : 'text-muted-foreground'
                                    }
                                  >
                                    {formatCurrency(Math.abs(net))}{' '}
                                    <span className="text-[10px] font-normal text-muted-foreground">
                                      {net >= 0 ? 'Dr' : 'Cr'}
                                    </span>
                                  </span>
                                </td>
                              </tr>

                              {/* Drill-down nested transactions inside Formatted TB */}
                              {isAccExpanded && (
                                <tr className="bg-muted/15 border-b border-border/60">
                                  <td colSpan={7} className="p-0">
                                    <div className="px-6 py-3.5 bg-muted/10">
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
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* P&L to Balance Sheet Bridge: Net Profit / Loss */}
            {group.category === 'Operating Expense' && (
              <div className="p-3.5 rounded-xl border border-dashed border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      netProfit >= 0
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {netProfit >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>Operating Result: {netProfit >= 0 ? 'Net Profit for Period' : 'Net Loss for Period'}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          netProfit >= 0
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold'
                        }`}
                      >
                        {formatCurrency(netProfit)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      Revenue ({formatCurrency(turnoverTotal)}) − Cost of Sales ({formatCurrency(costOfSalesTotal)}) − Overheads ({formatCurrency(operatingExpensesTotal)})
                    </p>
                  </div>
                </div>

                <div className="text-right sm:self-center font-mono text-xs">
                  <span className="text-[10px] uppercase font-sans text-muted-foreground block">
                    Rolls into Retained Earnings
                  </span>
                  <span
                    className={`font-bold text-sm ${
                      netProfit >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {netProfit >= 0 ? `+${formatCurrency(netProfit)}` : formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
      </div>

      {/* Grand Totals Summary Card */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">
              Statutory Double-Entry Consistency
            </h4>
            <p className="text-xs text-muted-foreground">
              Sum of categorized debits strictly reconciles with sum of categorized credits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs self-end sm:self-center">
          <div className="text-right">
            <span className="text-[10px] font-sans text-muted-foreground uppercase block">
              Grand Debits
            </span>
            <span className="font-bold text-sm text-foreground">
              {formatCurrency(grandDebit)}
            </span>
          </div>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div className="text-right">
            <span className="text-[10px] font-sans text-muted-foreground uppercase block">
              Grand Credits
            </span>
            <span className="font-bold text-sm text-foreground">
              {formatCurrency(grandCredit)}
            </span>
          </div>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div className="text-right">
            <span className="text-[10px] font-sans text-muted-foreground uppercase block">
              Variance
            </span>
            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
              {formatCurrency(variance)}
            </span>
          </div>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div className="text-right">
            <span className="text-[10px] font-sans text-muted-foreground uppercase block">
              {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
            </span>
            <span
              className={`font-bold text-sm ${
                netProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(netProfit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
