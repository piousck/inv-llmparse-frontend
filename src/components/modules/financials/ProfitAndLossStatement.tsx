import React, { useState } from 'react';
import {
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ProfitAndLossReport, ContributingTransaction } from '../../../lib/financialEngine';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../ui/Button';
import { InvoiceGroupedTransactions } from './InvoiceGroupedTransactions';

interface ProfitAndLossStatementProps {
  pnl: ProfitAndLossReport;
  onSelectInvoice?: (invoiceId: string) => void;
}

export const ProfitAndLossStatement: React.FC<ProfitAndLossStatementProps> = ({
  pnl,
  onSelectInvoice,
}) => {
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});

  const toggleLine = (key: string) => {
    setExpandedLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAll = () => {
    const allExp: Record<string, boolean> = {};
    for (const l of [...pnl.turnover.lines, ...pnl.costOfSales.lines, ...pnl.operatingExpenses.lines]) {
      if (l.transactions && l.transactions.length > 0) {
        allExp[l.accountCode || l.label] = true;
      }
    }
    setExpandedLines(allExp);
  };

  const collapseAll = () => {
    setExpandedLines({});
  };

  return (
    <div className="space-y-6">
      {/* Top P&L KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Turnover / Revenue
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-foreground font-mono">
              {formatCurrency(pnl.turnover.total)}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {pnl.turnover.lines.length} streams
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Cost of Sales (300)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-foreground font-mono">
              {formatCurrency(pnl.costOfSales.total)}
            </span>
            <span className="text-xs text-muted-foreground font-medium">Direct stock</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Gross Profit / Margin
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-xl font-bold font-mono ${
                pnl.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {formatCurrency(pnl.grossProfit)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {pnl.grossMarginPercent}%
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Net Profit / (Loss)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-xl font-bold font-mono ${
                pnl.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {formatCurrency(pnl.netProfit)}
            </span>
            <span className="text-xs text-muted-foreground font-medium">Before tax</span>
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <span className="font-bold text-xs text-foreground uppercase tracking-wider">
            Multi-Step Income Statement (Profit & Loss)
          </span>
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

      {/* Main Income Statement Presentation Card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="divide-y divide-border/60">
          {/* Section 1: Revenue / Turnover */}
          <div className="p-4 bg-muted/20">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <span>1. Turnover & Operating Revenue</span>
              <span>Amount (€)</span>
            </div>

            {pnl.turnover.lines.length === 0 ? (
              <div className="py-2 text-[11px] text-muted-foreground italic">
                No sales invoices parsed yet (purchases only scope).
              </div>
            ) : (
              <div className="space-y-1">
                {pnl.turnover.lines.map((line) => {
                  const key = line.accountCode || line.label;
                  const isExp = Boolean(expandedLines[key]);
                  const hasTxs = Boolean(line.transactions && line.transactions.length > 0);

                  return (
                    <div key={key} className="space-y-1">
                      <div
                        onClick={() => hasTxs && toggleLine(key)}
                        className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg text-[11px] transition-colors ${
                          hasTxs ? 'cursor-pointer hover:bg-muted/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {hasTxs && (
                            <button
                              type="button"
                              className="size-4 inline-flex items-center justify-center text-muted-foreground"
                            >
                              {isExp ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                            </button>
                          )}
                          <span className="font-bold text-foreground text-[11px]">{line.label}</span>
                          {hasTxs && (() => {
                            const invCount = new Set(line.transactions?.map((t) => t.invoiceId || t.invoiceNumber || t.id)).size;
                            const itemCount = line.transactions?.length || 0;
                            return (
                              <span
                                className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold"
                                title={`${invCount} invoices (${itemCount} line items)`}
                              >
                                {invCount} {invCount === 1 ? 'bill' : 'bills'}
                                {itemCount > invCount ? ` (${itemCount})` : ''}
                              </span>
                            );
                          })()}
                        </div>
                        <span className="font-mono font-bold text-[11px] text-foreground">
                          {formatCurrency(line.amount)}
                        </span>
                      </div>

                      {/* Drill-down transactions */}
                      {isExp && line.transactions && (
                        <PnlDrillDownTable
                          transactions={line.transactions}
                          accountCode={line.accountCode}
                          accountName={line.label}
                          onSelectInvoice={onSelectInvoice}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border font-bold text-[11px] text-foreground">
              <span>Total Turnover</span>
              <span className="font-mono text-[11px] font-bold">{formatCurrency(pnl.turnover.total)}</span>
            </div>
          </div>

          {/* Section 2: Cost of Sales */}
          <div className="p-4 bg-muted/30">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <span>2. Cost of Sales (Direct Stock & Wholesale Inventory)</span>
              <span>Amount (€)</span>
            </div>

            {pnl.costOfSales.lines.length === 0 ? (
              <div className="py-2 text-[11px] text-muted-foreground italic">
                No direct inventory purchases posted (300 Purchases).
              </div>
            ) : (
              <div className="space-y-1">
                {pnl.costOfSales.lines.map((line) => {
                  const key = line.accountCode || line.label;
                  const isExp = Boolean(expandedLines[key]);
                  const hasTxs = Boolean(line.transactions && line.transactions.length > 0);

                  return (
                    <div key={key} className="space-y-1">
                      <div
                        onClick={() => hasTxs && toggleLine(key)}
                        className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg text-[11px] transition-colors ${
                          hasTxs ? 'cursor-pointer hover:bg-muted/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {hasTxs && (
                            <button
                              type="button"
                              className="size-4 inline-flex items-center justify-center text-muted-foreground"
                            >
                              {isExp ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                            </button>
                          )}
                          <span className="font-bold text-foreground text-[11px]">{line.label}</span>
                          {line.accountCode === '300' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                              Section 60(2) Resale
                            </span>
                          )}
                          {hasTxs && (() => {
                            const invCount = new Set(line.transactions?.map((t) => t.invoiceId || t.invoiceNumber || t.id)).size;
                            const itemCount = line.transactions?.length || 0;
                            return (
                              <span
                                className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold"
                                title={`${invCount} invoices (${itemCount} line items)`}
                              >
                                {invCount} {invCount === 1 ? 'invoice' : 'invoices'}
                                {itemCount > invCount ? ` (${itemCount})` : ''}
                              </span>
                            );
                          })()}
                        </div>
                        <span className="font-mono font-bold text-[11px] text-foreground">
                          {formatCurrency(line.amount)}
                        </span>
                      </div>

                      {/* Drill-down transactions */}
                      {isExp && line.transactions && (
                        <PnlDrillDownTable
                          transactions={line.transactions}
                          accountCode={line.accountCode}
                          accountName={line.label}
                          onSelectInvoice={onSelectInvoice}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border font-bold text-[11px] text-foreground">
              <span>Total Cost of Sales</span>
              <span className="font-mono text-[11px] font-bold">{formatCurrency(pnl.costOfSales.total)}</span>
            </div>
          </div>

          {/* Gross Profit Strip */}
          <div className="p-3 bg-muted/60 flex items-center justify-between border-y-2 border-border font-bold text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-foreground font-black text-xs">GROSS PROFIT / (LOSS)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                {pnl.grossMarginPercent}% Margin
              </span>
            </div>
            <span
              className={`font-mono text-xs font-bold ${
                pnl.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {formatCurrency(pnl.grossProfit)}
            </span>
          </div>

          {/* Section 3: Operating Overheads */}
          <div className="p-4 bg-muted/20">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <span>3. Operating Expenses & Administrative Overheads (400 series)</span>
              <span>Amount (€)</span>
            </div>

            {pnl.operatingExpenses.lines.length === 0 ? (
              <div className="py-2 text-[11px] text-muted-foreground italic">
                No overhead expenses recorded.
              </div>
            ) : (
              <div className="space-y-1">
                {pnl.operatingExpenses.lines.map((line) => {
                  const key = line.accountCode || line.label;
                  const isExp = Boolean(expandedLines[key]);
                  const hasTxs = Boolean(line.transactions && line.transactions.length > 0);

                  return (
                    <div key={key} className="space-y-1">
                      <div
                        onClick={() => hasTxs && toggleLine(key)}
                        className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg text-[11px] transition-colors ${
                          hasTxs ? 'cursor-pointer hover:bg-muted/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {hasTxs && (
                            <button
                              type="button"
                              className="size-4 inline-flex items-center justify-center text-muted-foreground"
                            >
                              {isExp ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                            </button>
                          )}
                          <span className="font-bold text-foreground text-[11px]">{line.label}</span>
                          {line.accountCode === '413' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">
                              Section 60(1) Blocked
                            </span>
                          )}
                          {hasTxs && (() => {
                            const invCount = new Set(line.transactions?.map((t) => t.invoiceId || t.invoiceNumber || t.id)).size;
                            const itemCount = line.transactions?.length || 0;
                            return (
                              <span
                                className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold"
                                title={`${invCount} invoices (${itemCount} line items)`}
                              >
                                {invCount} {invCount === 1 ? 'invoice' : 'invoices'}
                                {itemCount > invCount ? ` (${itemCount})` : ''}
                              </span>
                            );
                          })()}
                        </div>
                        <span className="font-mono font-bold text-[11px] text-foreground">
                          {formatCurrency(line.amount)}
                        </span>
                      </div>

                      {/* Drill-down transactions */}
                      {isExp && line.transactions && (
                        <PnlDrillDownTable
                          transactions={line.transactions}
                          accountCode={line.accountCode}
                          accountName={line.label}
                          onSelectInvoice={onSelectInvoice}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border font-bold text-[11px] text-foreground">
              <span>Total Operating Expenses</span>
              <span className="font-mono text-[11px] font-bold">{formatCurrency(pnl.operatingExpenses.total)}</span>
            </div>
          </div>

          {/* Operating Profit & Net Profit */}
          <div className="p-3 bg-muted/40 space-y-2">
            <div className="flex items-center justify-between font-bold text-[11px] text-foreground">
              <span>Operating Profit (EBITDA)</span>
              <span className="font-mono text-[11px] font-bold">{formatCurrency(pnl.operatingProfit)}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border font-black text-xs text-foreground">
              <span>NET PROFIT / (LOSS) BEFORE TAX</span>
              <span
                className={`font-mono text-xs font-bold ${
                  pnl.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                {formatCurrency(pnl.netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PnlDrillDownTableProps {
  transactions: ContributingTransaction[];
  accountCode?: string;
  accountName?: string;
  onSelectInvoice?: (invoiceId: string) => void;
}

const PnlDrillDownTable: React.FC<PnlDrillDownTableProps> = ({
  transactions,
  accountCode,
  accountName,
  onSelectInvoice,
}) => {
  return (
    <div className="ml-5 mr-1 my-2.5">
      <InvoiceGroupedTransactions
        transactions={transactions}
        accountCode={accountCode}
        accountName={accountName}
        viewMode="pnl"
        onSelectInvoice={onSelectInvoice}
      />
    </div>
  );
};
