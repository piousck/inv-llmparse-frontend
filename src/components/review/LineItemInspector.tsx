import React, { useState } from 'react';
import { LineItem, XERO_ACCOUNT_CODES, IRISH_VAT_RATES } from '../../types/api';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../lib/utils';
import { Sparkles, HelpCircle, PanelRightClose, PanelRightOpen, Users, ShoppingCart, AlertTriangle, Globe, Lock, CheckCircle2, ShieldAlert } from 'lucide-react';

interface LineItemInspectorProps {
  item: LineItem | null;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onUpdateItem?: (updated: Partial<LineItem>) => void;
  isForeignPurchase?: boolean;
  currency?: string;
  isLocked?: boolean;
  style?: React.CSSProperties;
  inspectorRef?: React.Ref<HTMLElement>;
}

export const LineItemInspector: React.FC<LineItemInspectorProps> = ({
  item,
  isOpen: controlledIsOpen,
  onToggleOpen,
  onUpdateItem,
  isForeignPurchase = false,
  currency = 'EUR',
  isLocked = false,
  style,
  inspectorRef,
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(true);
  const isExpanded = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleToggle = () => {
    if (onToggleOpen) {
      onToggleOpen();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  // --- Collapsed State ---
  if (!isExpanded) {
    return (
      <aside
        ref={inspectorRef}
        style={style}
        onClick={handleToggle}
        className="w-12 bg-card hover:bg-muted/50 border border-border rounded-xl shadow-xs py-4 px-1.5 flex flex-col items-center cursor-pointer transition-all duration-200 group select-none shrink-0"
        title="Expand Line Item Inspector (Click to expand)"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className="p-1.5 rounded-lg text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors cursor-pointer"
          title="Expand Inspector"
        >
          <PanelRightOpen className="w-4 h-4 text-primary transition-transform group-hover:scale-110" />
        </button>

        <div className="h-6 w-px bg-border my-3" />

        <div className="[writing-mode:vertical-rl] rotate-180 flex items-center gap-2 text-xs font-bold text-muted-foreground group-hover:text-foreground tracking-wider uppercase py-2">
          <Sparkles className="w-3.5 h-3.5 text-primary rotate-180 shrink-0" />
          <span>Line Inspector</span>
        </div>

        {item && (
          <div
            className="mt-auto pt-4 flex flex-col items-center gap-1"
            title={`Inspecting: ${item.description} (${item.vat_code})`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-muted-foreground [writing-mode:vertical-rl] rotate-180 mt-1">
              {item.vat_code}
            </span>
          </div>
        )}
      </aside>
    );
  }

  // --- Expanded State ---
  const xeroDef = item ? XERO_ACCOUNT_CODES.find((x) => x.code === item.xero_account_code) : null;
  const vatDef = item ? IRISH_VAT_RATES.find((v) => v.code === item.vat_code) : null;
  const conf = item?.confidence || 0.95;

  const isStaffEnt = item?.entertainment_context === 'staff_entertainment';
  const isResale =
    item?.tax_treatment_notes?.includes('Section 60(2)(a)') ||
    (item?.xero_account_code === '300' && item?.entertainment_context === 'not_applicable' && item?.tax_treatment_notes?.includes('resale'));
  const isEntCandidate = item && (
    item.xero_account_code === '413' ||
    (item.xero_account_code === '429' && !item.vat_deductible) ||
    item.vat_code === 'TN' ||
    item.entertainment_context === 'client_entertainment' ||
    item.entertainment_context === 'mixed_or_unclear' ||
    isStaffEnt ||
    isResale ||
    (item.tax_treatment_notes && item.tax_treatment_notes.toLowerCase().includes('section 60'))
  );

  const isItemForeign =
    isForeignPurchase ||
    item?.tax_treatment_notes?.toLowerCase().includes('foreign') ||
    item?.tax_treatment_notes?.toLowerCase().includes('non-irish') ||
    item?.reasoning?.toLowerCase().includes('foreign');

  const handleApplyStaffEntertainment = () => {
    if (!item || !onUpdateItem) return;
    const grossAmount = item.gross_amount ?? +(item.net_amount + (item.vat_amount || 0)).toFixed(2);

    if (isItemForeign) {
      onUpdateItem({
        xero_account_code: '413',
        xero_expense_category: 'Expenses',
        entertainment_context: 'staff_entertainment',
        vat_deductible: false,
        income_tax_deductible: false,
        vat_code: 'TN',
        vat_rate: 0.0,
        vat_amount: 0.0,
        net_amount: grossAmount,
        gross_amount: grossAmount,
        tax_treatment_notes:
          'Non-domestic purchase: Foreign VAT cannot be claimed on Irish VAT3 (TN). Reclassified to 413 Staff Entertainment.',
      });
      return;
    }

    const statutoryRate = item.vat_rate > 0 ? item.vat_rate : 13.5;
    const vatCode =
      statutoryRate === 0
        ? 'T0'
        : Math.abs(statutoryRate - 13.5) < 0.2
        ? 'T135'
        : 'T23';
    const vatAmount = +(item.net_amount * (statutoryRate / 100)).toFixed(2);
    const computedGross = +(item.net_amount + vatAmount).toFixed(2);

    onUpdateItem({
      xero_account_code: '413',
      xero_expense_category: 'Expenses',
      entertainment_context: 'staff_entertainment',
      vat_deductible: true,
      income_tax_deductible: false,
      vat_code: vatCode,
      vat_rate: statutoryRate,
      vat_amount: vatAmount,
      gross_amount: computedGross,
      tax_treatment_notes:
        'Section 60(2)(b) staff entertainment: Input VAT claimable, CT non-deductible (Sec 840).',
    });
  };

  const handleApplyResale = () => {
    if (!item || !onUpdateItem) return;
    const grossAmount = item.gross_amount ?? +(item.net_amount + (item.vat_amount || 0)).toFixed(2);

    if (isItemForeign) {
      onUpdateItem({
        xero_account_code: '300',
        xero_expense_category: 'Direct Costs',
        entertainment_context: 'not_applicable',
        vat_deductible: false,
        income_tax_deductible: true,
        vat_code: 'TN',
        vat_rate: 0.0,
        vat_amount: 0.0,
        net_amount: grossAmount,
        gross_amount: grossAmount,
        tax_treatment_notes:
          'Non-domestic purchase: Foreign VAT cannot be claimed on Irish VAT3 (TN). Reclassified to 300 Purchases for resale.',
      });
      return;
    }

    const statutoryRate = item.vat_rate > 0 ? item.vat_rate : 23.0;
    const vatCode =
      statutoryRate === 0
        ? 'T0'
        : Math.abs(statutoryRate - 13.5) < 0.2
        ? 'T135'
        : 'T23';
    const vatAmount = +(item.net_amount * (statutoryRate / 100)).toFixed(2);
    const computedGross = +(item.net_amount + vatAmount).toFixed(2);

    onUpdateItem({
      xero_account_code: '300',
      xero_expense_category: 'Direct Costs',
      entertainment_context: 'not_applicable',
      vat_deductible: true,
      income_tax_deductible: true,
      vat_code: vatCode,
      vat_rate: statutoryRate,
      vat_amount: vatAmount,
      gross_amount: computedGross,
      tax_treatment_notes:
        'Section 60(2)(a) stock-in-trade resale exception: Input VAT & CT deductible.',
    });
  };

  const handleRevertToBlocked = () => {
    if (!item || !onUpdateItem) return;
    const gross = item.gross_amount ?? +(item.net_amount + (item.vat_amount || 0)).toFixed(2);
    onUpdateItem({
      xero_account_code: '413',
      xero_expense_category: 'Expenses',
      entertainment_context: 'client_entertainment',
      vat_deductible: false,
      income_tax_deductible: false,
      vat_code: 'TN',
      net_amount: gross,
      vat_amount: 0.0,
      gross_amount: gross,
      tax_treatment_notes: isItemForeign
        ? 'Non-domestic purchase: Foreign VAT unclaimable on Irish VAT3 (TN).'
        : 'Section 60(1) client entertainment: VAT blocked (TN).',
    });
  };

  return (
    <aside
      ref={inspectorRef}
      style={style}
      className="w-72 lg:w-80 bg-card rounded-xl border border-border shadow-xs flex flex-col shrink-0 overflow-hidden transition-all duration-200"
    >
      {/* Header with Title, Confidence Badge & Collapse Button */}
      <div className="px-4 py-3 border-b border-border bg-card/60 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-bold text-foreground truncate">Line Item Inspector</span>
          {item && (
            <Badge variant={conf >= 0.85 ? 'success' : 'warning'} className="shrink-0 text-[10px]">
              {Math.round(conf * 100)}% Conf
            </Badge>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          title="Collapse Line Item Inspector"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {!item ? (
        <div className="p-6 text-xs text-muted-foreground flex flex-col items-center justify-center text-center flex-1">
          <HelpCircle className="w-8 h-8 text-muted-foreground/50 mb-2" />
          <p className="font-semibold text-foreground">No item selected</p>
          <p className="text-[11px] mt-1">
            Click any line item row to inspect its tax rationale and coding reasoning.
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-sm min-h-0">
          {/* Description */}
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Item Description
            </span>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border font-normal text-foreground text-xs">
              {item.description}
            </div>
          </div>

          {/* GL Code */}
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              General Ledger Code
            </span>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <div className="font-normal text-foreground font-mono text-xs">
                {item.xero_account_code} · {xeroDef?.name || 'Custom Account'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Category: {xeroDef?.category || 'General Expense'}
              </div>
            </div>
          </div>

          {/* Irish VAT Rate */}
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Irish RTD Tax Treatment
            </span>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <div className="font-normal text-foreground font-mono text-xs">
                {item.vat_code} · {vatDef?.label || `${item.vat_rate}%`}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {item.vat_deductible ? (
                  item.vat_rate === 0 || item.vat_code === 'T0' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-normal flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> 100% Deductible (Zero-Rated · €0.00 VAT Charged)
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-normal flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> 100% Input VAT Claimable
                    </span>
                  )
                ) : isItemForeign ? (
                  <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 shrink-0" /> Non-Irish Purchase (Foreign VAT Unclaimable)
                  </span>
                ) : (
                  <span className="text-destructive font-normal flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> S.60 Non-Deductible (Blocked)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Non-Irish Purchase Foreign VAT Notice Card */}
          {isItemForeign && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Foreign VAT / Non-Irish Purchase</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Under Section 59 & 60 of the Irish VAT Consolidation Act 2010, VAT charged by non-Irish suppliers cannot be claimed on an Irish VAT3 return. Coded as <strong>TN</strong> (Excluded from Irish RTD) with <strong>€0.00 Claimed VAT</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Section 60 Entertainment VAT Options Card */}
          {isEntCandidate && onUpdateItem && (
            <div className="p-3.5 rounded-xl border border-border bg-muted/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  {isItemForeign ? 'Non-Domestic / Section 60' : 'Section 60 VAT Recovery'}
                </span>
                {isStaffEnt && (
                  <Badge variant={isItemForeign ? 'warning' : 'success'} className="text-[10px] py-0 font-bold">
                    {isItemForeign ? 'Staff Event (TN)' : 'Staff Event'}
                  </Badge>
                )}
                {isResale && (
                  <Badge variant="default" className="text-[10px] py-0 font-bold bg-blue-600 text-white">
                    {isItemForeign ? 'Resale (TN)' : 'Resale Stock'}
                  </Badge>
                )}
                {!isStaffEnt && !isResale && (
                  <Badge variant="destructive" className="text-[10px] py-0 font-bold">Blocked (TN)</Badge>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isItemForeign
                  ? 'Non-domestic purchase: Foreign VAT cannot be claimed on Irish VAT3 (TN). Reclassify for Corporation Tax and GL ledger purposes:'
                  : 'Hospitality VAT is blocked by default under Section 60(1). Claim input VAT using a statutory exception:'}
              </p>

              {isLocked && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Invoice is locked. Unlock to change tax treatment.</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  id="btn-inspector-staff-entertainment"
                  disabled={isLocked}
                  onClick={handleApplyStaffEntertainment}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                    isLocked
                      ? 'opacity-50 cursor-not-allowed border-border text-muted-foreground'
                      : isStaffEnt
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                      : 'border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-foreground'
                  }`}
                >
                  <Users className={`w-4 h-4 mt-0.5 shrink-0 ${isStaffEnt ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{isItemForeign ? 'Staff Entertainment (No VAT Claim)' : 'Staff Entertainment'}</span>
                      {isStaffEnt && <span className="text-[10px] text-emerald-600 font-semibold">{isItemForeign ? 'Applied (TN)' : 'Claimed'}</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      {isItemForeign
                        ? 'Reclassifies to Xero 413 Staff Entertainment. VAT remains unclaimable on VAT3 (TN).'
                        : 'Sec 60(2)(b): 100% Input VAT claimable. Xero 413, CT non-deductible (Sec 840).'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-inspector-resale-stock"
                  disabled={isLocked}
                  onClick={handleApplyResale}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                    isLocked
                      ? 'opacity-50 cursor-not-allowed border-border text-muted-foreground'
                      : isResale
                      ? 'border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500'
                      : 'border-border hover:border-blue-500/50 hover:bg-blue-500/5 text-foreground'
                  }`}
                >
                  <ShoppingCart className={`w-4 h-4 mt-0.5 shrink-0 ${isResale ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{isItemForeign ? 'Stock for Resale (No VAT Claim)' : 'Stock for Resale'}</span>
                      {isResale && <span className="text-[10px] text-blue-600 font-semibold">{isItemForeign ? 'Applied (TN)' : 'Claimed'}</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      {isItemForeign
                        ? 'Reclassifies to Xero 300 Purchases (CT deductible). Foreign VAT unclaimable on VAT3 (TN).'
                        : 'Sec 60(2)(a): Acquired for resale. Reclassifies to Xero 300 Purchases (100% Deductible).'}
                    </div>
                  </div>
                </button>
              </div>

              {(isStaffEnt || isResale) && !isLocked && (
                <button
                  type="button"
                  onClick={handleRevertToBlocked}
                  className="text-[10px] text-destructive/80 hover:text-destructive underline decoration-dotted w-full text-center block pt-1"
                >
                  Revert to Client Entertainment (Input VAT Blocked TN)
                </button>
              )}
            </div>
          )}

          {/* Financials Grid */}
          {(() => {
            const itemGross = item.gross_amount || +(item.net_amount + (item.vat_amount || 0)).toFixed(2);
            const itemClaimedVat = item.vat_deductible && !isItemForeign ? (item.vat_amount || 0) : 0;
            const itemNet = +(itemGross - itemClaimedVat).toFixed(2);

            return (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[11px] text-muted-foreground block">Net Value</span>
                  <span className="font-mono font-normal text-foreground text-xs">
                    {formatCurrency(itemNet, currency)}
                  </span>
                  {(!item.vat_deductible || isItemForeign) && (
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Gross - {formatCurrency(0, currency)} Claimed
                    </span>
                  )}
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[11px] text-muted-foreground block">Claimed VAT</span>
                  <span className="font-mono font-normal text-foreground text-xs">
                    {formatCurrency(itemClaimedVat, currency)}
                  </span>
                  {item.vat_deductible && !isItemForeign && (item.vat_rate === 0 || item.vat_code === 'T0') && (
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      0.0% Rate (Zero VAT)
                    </span>
                  )}
                  {(!item.vat_deductible || isItemForeign) && item.vat_amount > 0 && (
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Doc VAT: {formatCurrency(item.vat_amount, currency)}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* AI Extraction Rationale */}
          <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-foreground">
            <div className="flex items-center gap-1.5 font-bold text-primary text-xs mb-1">
              <Sparkles className="w-4 h-4" /> AI Coding Rationale
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {item.reasoning ||
                item.tax_treatment_notes ||
                'Mapped based on vendor trading history and item description under statutory Irish VAT rules.'}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
