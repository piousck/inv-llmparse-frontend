import React from 'react';
import { CheckCircle2, AlertCircle, ShieldAlert, Sparkles, Globe } from 'lucide-react';
import { LineItem, InvoiceDetail } from '../../types/api';
import { formatCurrency, isNonIrishPurchase } from '../../lib/utils';
import { Button } from '../ui/Button';

interface ReconciliationStripProps {
  totalNet: number;
  totalVat: number;
  totalGross: number;
  lineItems: LineItem[];
  onAutoReconcileVat?: () => void;
  invoice?: InvoiceDetail | null;
  reconciliationBoxRef?: React.Ref<HTMLDivElement>;
}

export const ReconciliationStrip: React.FC<ReconciliationStripProps> = ({
  totalNet: _totalNet,
  totalVat,
  totalGross,
  lineItems,
  onAutoReconcileVat,
  invoice,
  reconciliationBoxRef,
}) => {
  // 1. Claimable vs Blocked Input VAT
  const claimableVat = lineItems
    .filter((item) => item.vat_deductible)
    .reduce((acc, item) => acc + (item.vat_amount || 0), 0);

  const blockedVat = lineItems
    .filter((item) => !item.vat_deductible)
    .reduce((acc, item) => acc + (item.vat_amount || 0), 0);

  // 2. Net Figure: Gross - Claimed VAT (Accounting standard for VAT-claimed deductible expense)
  const netFigure = +(totalGross - claimableVat).toFixed(2);
  const computedHeaderGross = +(netFigure + claimableVat).toFixed(2);
  const isHeaderBalanced = Math.abs(totalGross - computedHeaderGross) < 0.02;

  // 3. Line Item Sum vs Net
  const sumLinesNet = lineItems.reduce((acc, item) => acc + (item.net_amount || 0), 0);
  const sumLinesVat = lineItems.reduce((acc, item) => acc + (item.vat_amount || 0), 0);
  const netDiff = Math.abs(netFigure - sumLinesNet);

  // 4. Foreign / Non-Irish Purchase Detection
  const isForeign = isNonIrishPurchase(invoice, null);
  const foreignUnclaimableVat = isForeign ? (totalVat > 0 ? totalVat : blockedVat) : 0;
  const curr = invoice?.currency || 'EUR';

  // 5. Unexplained VAT Discrepancy
  // If foreign purchase, non-claimed VAT is expected by law
  const unexplainedVatDiff = isForeign
    ? 0
    : Math.abs(totalVat - sumLinesVat);
  const isLinesBalanced = netDiff < 0.02 && unexplainedVatDiff < 0.02;

  return (
    <div className="flex flex-col gap-2 my-2 @container">
      {/* 3 Metric Cards matching mock */}
      <div className="grid grid-cols-1 @[600px]:grid-cols-3 gap-2.5">
        {/* Net Total (Gross - Claimed VAT) */}
        <div className="p-3 bg-muted/30 border border-border rounded-xl min-w-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <span>Net Total</span>
              <span className="text-[10px] text-muted-foreground font-normal">(Gross - VAT Claimed)</span>
            </span>
            {netDiff < 0.02 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> MATCH
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> BALANCED
              </span>
            )}
          </div>
          <div className="text-lg font-extrabold font-mono mt-1 text-foreground">
            {formatCurrency(netFigure, curr)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Gross ({formatCurrency(totalGross, curr)}) - Claimed VAT ({formatCurrency(claimableVat, curr)})
          </div>
        </div>

        {/* Claimed VAT (Statutory VAT3 Input Claim) */}
        <div className="p-3 bg-muted/30 border border-border rounded-xl min-w-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <span>Claimed VAT</span>
              <span className="text-[10px] text-muted-foreground font-normal">(VAT3)</span>
            </span>
            {isForeign ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                <Globe className="w-3.5 h-3.5" /> NON-IRISH
              </span>
            ) : Math.abs(claimableVat) > 0.01 && Math.abs(claimableVat - totalVat) < 0.02 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% CLAIMED
              </span>
            ) : Math.abs(blockedVat) > 0.01 ? (
              <span className="text-amber-600 font-bold text-xs">
                PARTIALLY CLAIMED
              </span>
            ) : Math.abs(totalVat) < 0.01 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                0% ZERO / EXEMPT
              </span>
            ) : Math.abs(claimableVat) > 0.01 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">
                {formatCurrency(claimableVat, curr)} CLAIMED (VAT MISMATCH)
              </span>
            ) : (
              <span className="text-destructive font-bold text-xs">
                {formatCurrency(0, curr)} CLAIMED
              </span>
            )}
          </div>
          <div className="text-lg font-extrabold font-mono mt-1 text-foreground flex items-baseline gap-2">
            <span className={Math.abs(claimableVat) > 0.01 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}>
              {formatCurrency(claimableVat, curr)}
            </span>
            {isForeign && (
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold px-1.5 py-0.5 bg-amber-500/15 rounded">
                Unclaimable
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {isForeign ? (
              <span>Non-Irish purchase: {formatCurrency(0, curr)} claimable (Doc VAT: {formatCurrency(totalVat, curr)})</span>
            ) : Math.abs(blockedVat) > 0.01 ? (
              <span>Doc VAT: {formatCurrency(totalVat, curr)} · Blocked: {formatCurrency(blockedVat, curr)}</span>
            ) : (
              <span>Document VAT: {formatCurrency(totalVat, curr)}</span>
            )}
          </div>
        </div>

        {/* Invoice Total Gross */}
        <div className="p-3 bg-muted/30 border border-border rounded-xl min-w-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span className="font-bold text-foreground">Invoice Total (Gross)</span>
            {isHeaderBalanced ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> BALANCED
              </span>
            ) : (
              <span className="text-destructive font-bold text-xs flex items-center gap-0.5">
                <AlertCircle className="w-3.5 h-3.5" /> OUT OF BALANCE
              </span>
            )}
          </div>
          <div className="text-lg font-extrabold font-mono mt-1 text-foreground">
            {formatCurrency(totalGross, curr)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Net ({formatCurrency(netFigure, curr)}) + Claimed VAT ({formatCurrency(claimableVat, curr)})
          </div>
        </div>
      </div>

      {/* Actionable Non-Irish Purchase Alert */}
      {isForeign && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5 text-xs shadow-xs text-amber-900 dark:text-amber-200">
          <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-foreground">Non-Irish Purchase — VAT Unclaimable on Irish VAT3: </span>
            <span className="text-muted-foreground">
              Supplier is located outside Ireland {invoice?.seller_vat ? `(VAT: ${invoice.seller_vat})` : ''}. Under Irish VAT law (Section 59/60 VATCA 2010), input VAT charged by non-Irish suppliers cannot be claimed on your domestic Irish VAT3 return. All VAT is coded as <strong>TN</strong> (Excluded from Irish RTD) with <strong>{formatCurrency(0, curr)} Claimed VAT</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Actionable VAT Discrepancy Banner */}
      {!isForeign && unexplainedVatDiff >= 0.02 && onAutoReconcileVat && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-foreground">VAT Discrepancy Detected: </span>
              <span className="text-muted-foreground">
                Line items compute <span className="font-mono font-semibold text-foreground">{formatCurrency(sumLinesVat, curr)}</span> VAT, but invoice specifies <span className="font-mono font-semibold text-foreground">{formatCurrency(totalVat, curr)}</span> total VAT (Δ {formatCurrency(unexplainedVatDiff, curr)}).
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onAutoReconcileVat}
            className="shrink-0 h-8 gap-1.5 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Auto-Reconcile Line VAT to Document Total
          </Button>
        </div>
      )}

      {/* Statutory RTD / Irish Claimable Breakdown */}
      <div
        ref={reconciliationBoxRef}
        id="reconciliation-claimable-box"
        className="px-4 py-3 bg-card border border-border rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground text-xs">Claimable Input VAT:</span>
            <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              {formatCurrency(claimableVat, curr)}
            </strong>
          </div>

          {isForeign && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-muted-foreground text-xs">Non-Irish Purchase (Unclaimable):</span>
              <strong className="font-mono text-amber-700 dark:text-amber-400 font-bold text-sm">
                {formatCurrency(foreignUnclaimableVat, curr)}
              </strong>
            </div>
          )}

          {!isForeign && blockedVat > 0 && (
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground text-xs">Blocked S.60 VAT:</span>
              <strong className="font-mono text-amber-700 dark:text-amber-400 font-bold text-sm">
                {formatCurrency(blockedVat, curr)}
              </strong>
            </div>
          )}
        </div>

        <div>
          {isHeaderBalanced && isLinesBalanced ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" /> All calculations reconcile with invoice totals
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-destructive font-bold">
              <AlertCircle className="w-4 h-4" /> Reconciliation warning: please check line net & tax values
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
