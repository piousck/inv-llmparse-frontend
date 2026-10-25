import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, ExternalLink, FileText, Layers, Search } from 'lucide-react';
import { ContributingTransaction } from '../../../lib/financialEngine';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../ui/Button';

export interface InvoiceGroupedTransactionsProps {
  transactions: ContributingTransaction[];
  accountCode?: string;
  accountName?: string;
  viewMode?: 'tb' | 'pnl';
  onSelectInvoice?: (invoiceId: string) => void;
}

interface InvoiceGroup {
  key: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  sellerName: string;
  currency: string;
  postingType: 'debit' | 'credit';
  lineCount: number;
  totalNet: number;
  totalVat: number;
  totalVatClaimed: number;
  totalGross: number;
  totalAmount: number;
  vatCodes: string[];
  lines: ContributingTransaction[];
}

export const InvoiceGroupedTransactions: React.FC<InvoiceGroupedTransactionsProps> = ({
  transactions,
  accountCode,
  accountName,
  viewMode = 'tb',
  onSelectInvoice,
}) => {
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Group transactions by invoice
  const groupedInvoices: InvoiceGroup[] = useMemo(() => {
    const map = new Map<string, InvoiceGroup>();

    for (const tx of transactions) {
      const key = tx.invoiceId || tx.invoiceNumber || tx.id;
      if (!map.has(key)) {
        map.set(key, {
          key,
          invoiceId: tx.invoiceId,
          invoiceNumber: tx.invoiceNumber || 'N/A',
          invoiceDate: tx.invoiceDate || '',
          sellerName: tx.sellerName || 'Direct Posting',
          currency: tx.currency || 'EUR',
          postingType: tx.postingType || 'debit',
          lineCount: 0,
          totalNet: 0,
          totalVat: 0,
          totalVatClaimed: 0,
          totalGross: 0,
          totalAmount: 0,
          vatCodes: [],
          lines: [],
        });
      }

      const group = map.get(key)!;
      group.lineCount += 1;
      group.totalNet = Math.round((group.totalNet + (tx.netAmount || 0)) * 100) / 100;
      group.totalVat = Math.round((group.totalVat + (tx.vatAmount || 0)) * 100) / 100;
      group.totalVatClaimed = Math.round((group.totalVatClaimed + (tx.vatClaimed || 0)) * 100) / 100;
      group.totalGross = Math.round((group.totalGross + (tx.grossAmount || 0)) * 100) / 100;
      group.totalAmount = Math.round((group.totalAmount + (tx.amount || 0)) * 100) / 100;
      if (tx.vatCode && !group.vatCodes.includes(tx.vatCode)) {
        group.vatCodes.push(tx.vatCode);
      }
      group.lines.push(tx);
    }

    // Sort by date ascending
    return Array.from(map.values()).sort((a, b) => {
      if (!a.invoiceDate) return 1;
      if (!b.invoiceDate) return -1;
      return a.invoiceDate.localeCompare(b.invoiceDate);
    });
  }, [transactions]);

  // Filter groups by user query
  const filteredGroups = useMemo(() => {
    if (!filterQuery.trim()) return groupedInvoices;
    const q = filterQuery.toLowerCase();
    return groupedInvoices.filter(
      (g) =>
        g.invoiceNumber.toLowerCase().includes(q) ||
        g.sellerName.toLowerCase().includes(q) ||
        g.lines.some((l) => l.description?.toLowerCase().includes(q))
    );
  }, [groupedInvoices, filterQuery]);

  const toggleExpandInvoice = (key: string) => {
    setExpandedInvoices((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const g of groupedInvoices) {
      next[g.key] = true;
    }
    setExpandedInvoices(next);
  };

  const collapseAll = () => {
    setExpandedInvoices({});
  };

  const totalLines = transactions.length;
  const isAllExpanded = groupedInvoices.length > 0 && groupedInvoices.every((g) => expandedInvoices[g.key]);

  return (
    <div className="space-y-2.5">
      {/* Header bar with invoice count and controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-bold text-foreground">
            {accountCode ? `Account ${accountCode}` : ''} {accountName ? `(${accountName})` : ''} Contributing Invoices
          </span>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[11px] font-bold">
            {groupedInvoices.length} {groupedInvoices.length === 1 ? 'invoice' : 'invoices'}
            {totalLines > groupedInvoices.length ? ` · ${totalLines} itemized lines` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
          {groupedInvoices.length > 3 && (
            <div className="relative">
              <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter invoice or line..."
                className="pl-6 pr-2 py-0.5 text-[11px] rounded border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-36"
              />
            </div>
          )}

          {groupedInvoices.some((g) => g.lineCount > 1) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={isAllExpanded ? collapseAll : expandAll}
              className="h-6 text-[11px] px-2 py-0 font-medium text-muted-foreground hover:text-foreground"
            >
              {isAllExpanded ? 'Collapse All Lines' : 'Expand All Lines'}
            </Button>
          )}
        </div>
      </div>

      {/* Grouped Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] uppercase font-semibold text-muted-foreground">
                <th className="py-2 px-2.5 w-8 text-center"></th>
                <th className="py-2 px-3 whitespace-nowrap">Date</th>
                <th className="py-2 px-3 whitespace-nowrap">Invoice #</th>
                <th className="py-2 px-3">Supplier / Counterparty</th>
                <th className="py-2 px-3">Description / Summary</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">Net</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">VAT</th>
                {viewMode === 'tb' && (
                  <>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Claimed VAT</th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Gross</th>
                    <th className="py-2 px-2.5 text-center whitespace-nowrap">Posting</th>
                  </>
                )}
                <th className="py-2 px-3 text-right whitespace-nowrap font-bold">
                  {viewMode === 'pnl' ? 'Expense Debit' : 'Amount'}
                </th>
                <th className="py-2 px-3 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'tb' ? 12 : 9} className="py-6 text-center text-muted-foreground italic text-xs">
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  const isExpanded = Boolean(expandedInvoices[group.key]);
                  const hasMultipleLines = group.lineCount > 1;

                  // Summary description
                  const summaryDescription = hasMultipleLines
                    ? `${group.lineCount} lines: ${group.lines
                        .map((l) => l.description)
                        .filter(Boolean)
                        .slice(0, 2)
                        .join(', ')}${group.lineCount > 2 ? '...' : ''}`
                    : group.lines[0]?.description || 'General invoice posting';

                  return (
                    <React.Fragment key={group.key}>
                      {/* Tier 1: Single Invoice Row */}
                      <tr
                        onClick={() => toggleExpandInvoice(group.key)}
                        className={`transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-muted/30 font-medium'
                            : 'hover:bg-muted/20'
                        }`}
                      >
                        {/* Drill-down Toggle Button */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandInvoice(group.key);
                            }}
                            title={isExpanded ? 'Collapse line items' : 'Drill down to view itemized line items'}
                            className="size-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-transform"
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-3.5 text-primary" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </button>
                        </td>

                        {/* Date */}
                        <td className="py-2 px-3 font-mono text-muted-foreground whitespace-nowrap">
                          {group.invoiceDate || '—'}
                        </td>

                        {/* Invoice # */}
                        <td className="py-2 px-3 font-mono font-bold text-primary whitespace-nowrap">
                          {onSelectInvoice && group.invoiceId ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectInvoice(group.invoiceId);
                              }}
                              className="hover:underline inline-flex items-center gap-1 cursor-pointer"
                              title="Inspect invoice in Review Hub"
                            >
                              <FileText className="size-3 text-primary/70 shrink-0" />
                              <span>{group.invoiceNumber}</span>
                              <ExternalLink className="size-2.5 opacity-50" />
                            </button>
                          ) : (
                            <span>{group.invoiceNumber}</span>
                          )}
                        </td>

                        {/* Supplier */}
                        <td className="py-2 px-3 font-medium text-foreground truncate max-w-[150px]">
                          {group.sellerName}
                        </td>

                        {/* Description & Line Count Badge */}
                        <td className="py-2 px-3 text-muted-foreground max-w-[240px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasMultipleLines && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-bold text-[9px] bg-primary/10 text-primary border border-primary/20 shrink-0">
                                {group.lineCount} lines
                              </span>
                            )}
                            <span className="truncate text-foreground text-xs" title={summaryDescription}>
                              {summaryDescription}
                            </span>
                          </div>
                        </td>

                        {/* Net Amount */}
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {formatCurrency(group.totalNet, group.currency)}
                        </td>

                        {/* VAT Code */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {group.vatCodes.length > 1
                              ? 'Multi'
                              : group.vatCodes[0] || '—'}
                          </span>
                        </td>

                        {/* TB Extra Columns */}
                        {viewMode === 'tb' && (
                          <>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                              {formatCurrency(group.totalVatClaimed, group.currency)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                              {formatCurrency(group.totalGross, group.currency)}
                            </td>
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              <span
                                className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                                  group.postingType === 'debit'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                }`}
                              >
                                {group.postingType}
                              </span>
                            </td>
                          </>
                        )}

                        {/* Amount */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {formatCurrency(group.totalAmount, group.currency)}
                        </td>

                        {/* Action */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandInvoice(group.key);
                              }}
                              className="text-[10px] text-primary hover:underline font-semibold cursor-pointer px-1 py-0.5"
                            >
                              {isExpanded ? 'Hide' : hasMultipleLines ? `View ${group.lineCount} lines` : 'Details'}
                            </button>
                            {onSelectInvoice && group.invoiceId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectInvoice(group.invoiceId);
                                }}
                                className="h-5 text-[10px] px-1.5 py-0"
                                title="Inspect in Review Hub"
                              >
                                Inspect
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Tier 2: Itemized Lines Drill-Down Sub-Table */}
                      {isExpanded && (
                        <tr className="bg-muted/15 border-b border-border/70">
                          <td colSpan={viewMode === 'tb' ? 12 : 9} className="py-2 px-4 bg-muted/20">
                            <div className="ml-4 pl-3 border-l-2 border-primary/40 space-y-1.5 my-1">
                              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-wider pb-1">
                                <span>
                                  Itemized Line Items for Invoice #{group.invoiceNumber} ({group.lineCount} {group.lineCount === 1 ? 'item' : 'items'})
                                </span>
                                <span className="font-normal text-muted-foreground">
                                  {group.sellerName} · {group.invoiceDate}
                                </span>
                              </div>

                              <div className="rounded border border-border/70 bg-card overflow-hidden">
                                <table className="w-full text-left text-[10px]">
                                  <thead>
                                    <tr className="bg-muted/40 border-b border-border/50 text-[9px] uppercase font-semibold text-muted-foreground">
                                      <th className="py-1 px-2.5 w-8 text-center">#</th>
                                      <th className="py-1 px-3">Item Description</th>
                                      <th className="py-1 px-3 text-right whitespace-nowrap">Qty × Unit Price</th>
                                      <th className="py-1 px-3 text-right whitespace-nowrap">Net</th>
                                      <th className="py-1 px-2 text-center whitespace-nowrap">Rate / VAT Code</th>
                                      <th className="py-1 px-3 text-right whitespace-nowrap">VAT Amount</th>
                                      {viewMode === 'tb' && (
                                        <th className="py-1 px-3 text-right whitespace-nowrap">Claimed VAT</th>
                                      )}
                                      <th className="py-1 px-3 text-right whitespace-nowrap font-bold">Line Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/30 font-mono">
                                    {group.lines.map((line, idx) => (
                                      <tr key={line.id || idx} className="hover:bg-muted/20">
                                        <td className="py-1.5 px-2.5 text-center text-muted-foreground text-[9px]">
                                          {idx + 1}
                                        </td>
                                        <td className="py-1.5 px-3 font-sans font-normal text-foreground">
                                          <div>{line.description}</div>
                                          {line.taxTreatmentNotes && (
                                            <div className="text-[9px] text-muted-foreground/80 font-sans italic">
                                              {line.taxTreatmentNotes}
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-muted-foreground whitespace-nowrap">
                                          {line.quantity !== undefined && line.unitPrice !== undefined ? (
                                            <span>
                                              {line.quantity} × {formatCurrency(line.unitPrice, line.currency)}
                                            </span>
                                          ) : (
                                            <span className="opacity-40">—</span>
                                          )}
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-muted-foreground whitespace-nowrap">
                                          {formatCurrency(line.netAmount, line.currency)}
                                        </td>
                                        <td className="py-1.5 px-2 text-center whitespace-nowrap">
                                          <span className="px-1 py-0.2 rounded bg-muted/80 text-muted-foreground text-[9px]">
                                            {line.vatCode || '—'} {line.vatRate ? `(${line.vatRate}%)` : ''}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-muted-foreground whitespace-nowrap">
                                          {formatCurrency(line.vatAmount, line.currency)}
                                        </td>
                                        {viewMode === 'tb' && (
                                          <td className="py-1.5 px-3 text-right text-muted-foreground whitespace-nowrap">
                                            {formatCurrency(line.vatClaimed, line.currency)}
                                          </td>
                                        )}
                                        <td className="py-1.5 px-3 text-right font-bold text-foreground whitespace-nowrap">
                                          {formatCurrency(line.amount, line.currency)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
