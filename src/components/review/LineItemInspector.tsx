import React, { useState, useMemo } from 'react';
import { LineItem, XERO_ACCOUNT_CODES, IRISH_VAT_RATES, OrganizationGLAccount } from '../../types/api';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../lib/utils';
import {
  Sparkles,
  HelpCircle,
  PanelRightClose,
  PanelRightOpen,
  Users,
  ShoppingCart,
  AlertTriangle,
  Globe,
  Lock,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';

interface LineItemInspectorProps {
  item: LineItem | null;
  lineIndex?: number;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onUpdateItem?: (updated: Partial<LineItem>) => void;
  isForeignPurchase?: boolean;
  currency?: string;
  isLocked?: boolean;
  style?: React.CSSProperties;
  inspectorRef?: React.Ref<HTMLElement>;
  glAccounts?: OrganizationGLAccount[];
}

export const LineItemInspector: React.FC<LineItemInspectorProps> = ({
  item,
  lineIndex,
  isOpen: controlledIsOpen,
  onToggleOpen,
  onUpdateItem,
  isForeignPurchase = false,
  currency = 'EUR',
  isLocked = false,
  style,
  inspectorRef,
  glAccounts,
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const isExpanded = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleToggle = () => {
    if (onToggleOpen) {
      onToggleOpen();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  const availableAccounts = useMemo(() => {
    if (glAccounts && glAccounts.length > 0) {
      return glAccounts.map((a) => ({
        code: a.code,
        name: a.name,
        category: a.category || 'General',
      }));
    }
    return XERO_ACCOUNT_CODES;
  }, [glAccounts]);

  const getCurrencySymbol = (curr: string) => {
    if (curr === 'EUR' || curr === '€') return '€';
    if (curr === 'USD' || curr === '$') return '$';
    if (curr === 'GBP' || curr === '£') return '£';
    return curr || '€';
  };
  const sym = getCurrencySymbol(currency);

  // --- Collapsed State (Minimised Bar filling top to bottom) ---
  if (!isExpanded) {
    return (
      <aside
        ref={inspectorRef}
        style={style}
        onClick={handleToggle}
        className="w-12 h-full min-h-0 self-stretch bg-card hover:bg-muted/40 border border-border rounded-xl shadow-xs py-3.5 px-1 flex flex-col items-center cursor-pointer transition-all duration-200 group select-none shrink-0"
        title="Expand Line Item Inspector (Click to expand)"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className="p-1.5 rounded-lg text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80 transition-colors cursor-pointer"
          title="Expand Line Inspector"
        >
          <PanelRightOpen className="w-4 h-4 text-primary transition-transform group-hover:scale-110" />
        </button>

        <div className="h-6 w-px bg-border my-2.5" />

        <div className="[writing-mode:vertical-rl] rotate-180 flex items-center gap-2 text-xs font-bold text-muted-foreground group-hover:text-foreground tracking-wider uppercase py-2">
          <Sparkles className="w-3.5 h-3.5 text-primary rotate-180 shrink-0" />
          <span>Line Inspector</span>
        </div>

        {item && (
          <div
            className="mt-auto pb-2 flex flex-col items-center gap-1.5"
            title={`Selected Line: ${item.description || 'Line item'} (${item.vat_code || 'T23'})`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-muted-foreground [writing-mode:vertical-rl] rotate-180">
              {item.vat_code || 'T23'}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground [writing-mode:vertical-rl] rotate-180">
              {item.xero_account_code || '429'}
            </span>
          </div>
        )}
      </aside>
    );
  }

  // --- Expanded State ---
  const xeroDef = item
    ? (availableAccounts.find((x) => x.code === item.xero_account_code) ||
       XERO_ACCOUNT_CODES.find((x) => x.code === item.xero_account_code))
    : null;
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

  // Input Change Handlers for Inline Editing
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!item || !onUpdateItem || isLocked) return;
    onUpdateItem({ description: e.target.value });
  };

  const handleGLCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!item || !onUpdateItem || isLocked) return;
    const newCode = e.target.value;
    const selected = availableAccounts.find((x) => x.code === newCode);
    const isS60 = newCode === '413';
    onUpdateItem({
      xero_account_code: newCode,
      xero_expense_category: selected ? selected.category : item.xero_expense_category,
      vat_deductible: !isS60,
      vat_code: isS60 ? 'TN' : item.vat_code === 'TN' ? 'T23' : item.vat_code,
    });
  };

  const handleVatCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!item || !onUpdateItem || isLocked) return;
    const newVatCode = e.target.value;
    const selectedRate = IRISH_VAT_RATES.find((r) => r.code === newVatCode);
    const rate = selectedRate ? selectedRate.rate : 23.0;

    let newVat = 0.0;
    if (newVatCode === 'TN' || newVatCode === 'T0') {
      newVat = 0.0;
    } else {
      newVat = +(item.net_amount * (rate / 100)).toFixed(2);
    }
    const newGross = +(item.net_amount + newVat).toFixed(2);

    onUpdateItem({
      vat_code: newVatCode,
      vat_rate: rate,
      vat_amount: newVat,
      net_amount: item.net_amount,
      gross_amount: newGross,
      vat_deductible: newVatCode !== 'TN',
    });
  };

  const handleToggleDeductible = () => {
    if (!item || !onUpdateItem || isLocked) return;
    const nextDeductible = !item.vat_deductible;
    onUpdateItem({
      vat_deductible: nextDeductible,
      vat_code: nextDeductible ? (item.vat_code === 'TN' ? 'T23' : item.vat_code) : 'TN',
    });
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!item || !onUpdateItem || isLocked) return;
    const val = parseFloat(e.target.value);
    const qty = isNaN(val) ? 0 : val;
    const unitPrice = item.unit_price || (item.quantity ? item.net_amount / item.quantity : item.net_amount);
    const newNet = +(qty * unitPrice).toFixed(2);
    const rate = item.vat_rate || 0.0;
    const newVat = item.vat_code === 'TN' ? 0.0 : +(newNet * (rate / 100)).toFixed(2);
    const newGross = +(newNet + newVat).toFixed(2);

    onUpdateItem({
      quantity: qty,
      unit_price: unitPrice,
      net_amount: newNet,
      vat_amount: newVat,
      gross_amount: newGross,
    });
  };

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!item || !onUpdateItem || isLocked) return;
    const val = parseFloat(e.target.value);
    const unitPrice = isNaN(val) ? 0 : val;
    const qty = item.quantity || 1;
    const newNet = +(qty * unitPrice).toFixed(2);
    const rate = item.vat_rate || 0.0;
    const newVat = item.vat_code === 'TN' ? 0.0 : +(newNet * (rate / 100)).toFixed(2);
    const newGross = +(newNet + newVat).toFixed(2);

    onUpdateItem({
      unit_price: unitPrice,
      net_amount: newNet,
      vat_amount: newVat,
      gross_amount: newGross,
    });
  };

  const handleNetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!item || !onUpdateItem || isLocked) return;
    const val = parseFloat(e.target.value);
    const netAmount = isNaN(val) ? 0 : val;
    const rate = item.vat_rate || 0.0;
    const newVat = item.vat_code === 'TN' ? 0.0 : +(netAmount * (rate / 100)).toFixed(2);
    const newGross = +(netAmount + newVat).toFixed(2);
    const qty = item.quantity || 1;
    const newUnitPrice = +(netAmount / qty).toFixed(2);

    onUpdateItem({
      net_amount: netAmount,
      vat_amount: newVat,
      gross_amount: newGross,
      unit_price: newUnitPrice,
    });
  };

  const handleVatAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!item || !onUpdateItem || isLocked) return;
    const val = parseFloat(e.target.value);
    const vatAmount = isNaN(val) ? 0 : val;
    const newGross = +(item.net_amount + vatAmount).toFixed(2);

    onUpdateItem({
      vat_amount: vatAmount,
      gross_amount: newGross,
    });
  };

  const handleGrossAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!item || !onUpdateItem || isLocked) return;
    const val = parseFloat(e.target.value);
    const grossAmount = isNaN(val) ? 0 : val;
    const rate = item.vat_rate || 0.0;
    let newNet = grossAmount;
    let newVat = 0.0;

    if (rate > 0 && item.vat_code !== 'TN') {
      newNet = +(grossAmount / (1 + rate / 100)).toFixed(2);
      newVat = +(grossAmount - newNet).toFixed(2);
    }
    const qty = item.quantity || 1;
    const newUnitPrice = +(newNet / qty).toFixed(2);

    onUpdateItem({
      gross_amount: grossAmount,
      net_amount: newNet,
      vat_amount: newVat,
      unit_price: newUnitPrice,
    });
  };

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
      className="w-80 lg:w-84 xl:w-92 h-full min-h-0 self-stretch bg-card rounded-xl border border-border shadow-xs flex flex-col shrink-0 overflow-hidden transition-all duration-200"
    >
      {/* Header with Title, Line Index, Confidence Badge & Collapse Button */}
      <div className="px-3.5 py-2.5 border-b border-border bg-card/60 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground truncate">Line Inspector</span>
          {lineIndex !== undefined && (
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
              #{lineIndex + 1}
            </span>
          )}
          {item && (
            <Badge variant={conf >= 0.85 ? 'success' : 'warning'} className="shrink-0 text-[10px] py-0 px-1.5 font-bold">
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
            Click any line item row in the table to inspect and edit its details.
          </p>
        </div>
      ) : (
        <div className="p-3.5 space-y-3.5 overflow-y-auto flex-1 min-h-0 text-xs">
          {/* Locked Notice */}
          {isLocked && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-2 font-medium">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Invoice is locked. Changes are disabled.</span>
            </div>
          )}

          {/* 1. Item Description */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Item Description
            </span>
            {!isLocked ? (
              <textarea
                rows={2}
                value={item.description || ''}
                onChange={handleDescriptionChange}
                placeholder="Line description..."
                className="w-full text-xs font-normal text-foreground bg-background hover:border-foreground/30 focus:border-primary border border-border rounded-lg p-2 outline-none resize-none transition-colors"
              />
            ) : (
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border font-normal text-foreground text-xs leading-relaxed">
                {item.description || '—'}
              </div>
            )}
          </div>

          {/* 2. General Ledger Code */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              General Ledger Account
            </span>
            {!isLocked ? (
              <div className="relative">
                <select
                  value={item.xero_account_code}
                  onChange={handleGLCodeChange}
                  className="w-full text-xs font-mono font-medium text-foreground bg-background hover:border-foreground/30 focus:border-primary border border-border rounded-lg p-2 outline-none cursor-pointer pr-8 truncate transition-colors appearance-none"
                >
                  {availableAccounts.map((acc) => (
                    <option key={acc.code} value={acc.code} className="text-foreground bg-card py-1 font-sans">
                      {acc.code} · {acc.name} ({acc.category})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-muted/30 border border-border">
                <div className="font-mono text-xs font-bold text-foreground">
                  {item.xero_account_code} · {xeroDef?.name || item.xero_expense_category || 'Custom Account'}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Category: {xeroDef?.category || item.xero_expense_category || 'General Expense'}
                </div>
              </div>
            )}
            {!isLocked && (
              <div className="text-[10px] text-muted-foreground flex items-center justify-between px-0.5">
                <span className="truncate">Category: {xeroDef?.category || item.xero_expense_category || 'Expense'}</span>
                <span className="font-mono font-semibold shrink-0">{xeroDef?.name || item.xero_expense_category}</span>
              </div>
            )}
          </div>

          {/* 3. Irish RTD Tax Treatment & Rate */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Irish RTD Tax Treatment
            </span>
            {!isLocked ? (
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={item.vat_code}
                    onChange={handleVatCodeChange}
                    className="w-full text-xs font-mono font-medium text-foreground bg-background hover:border-foreground/30 focus:border-primary border border-border rounded-lg p-2 outline-none cursor-pointer pr-8 truncate transition-colors appearance-none"
                  >
                    {IRISH_VAT_RATES.map((vat) => (
                      <option key={vat.code} value={vat.code} className="text-foreground bg-card py-1 font-sans">
                        {vat.code} · {vat.label} ({vat.rate}%)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border cursor-pointer select-none hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={item.vat_deductible}
                    onChange={handleToggleDeductible}
                    className="w-3.5 h-3.5 text-primary rounded border-border focus:ring-primary cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-foreground block">
                      Input VAT Claimable (Irish VAT3)
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {item.vat_deductible
                        ? '100% Deductible input tax under Sec 59'
                        : 'Blocked / non-deductible under Sec 60 or foreign rules'}
                    </span>
                  </div>
                </label>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-muted/30 border border-border">
                <div className="font-mono text-xs font-bold text-foreground">
                  {item.vat_code} · {vatDef?.label || `${item.vat_rate}%`}
                </div>
                <div className="text-[10px] mt-1">
                  {item.vat_deductible ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" /> 100% Input VAT Claimable
                    </span>
                  ) : isItemForeign ? (
                    <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                      <Globe className="w-3 h-3 shrink-0" /> Non-Irish Purchase (Foreign VAT Unclaimable)
                    </span>
                  ) : (
                    <span className="text-destructive font-medium flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 shrink-0" /> S.60 Non-Deductible (Blocked)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Financials & Quantities (Editable Inputs) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Financials & Quantities
            </span>

            {!isLocked ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Quantity</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.quantity}
                      onChange={handleQuantityChange}
                      className="w-full font-mono text-xs text-foreground bg-background hover:border-foreground/30 focus:border-primary border border-border rounded-lg px-2.5 py-1.5 outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Unit Price</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono pointer-events-none">
                        {sym}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={handleUnitPriceChange}
                        className="w-full font-mono text-xs text-foreground bg-background hover:border-foreground/30 focus:border-primary border border-border rounded-lg pl-6 pr-2 py-1.5 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Net Amount</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono pointer-events-none">
                        {sym}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.net_amount}
                        onChange={handleNetAmountChange}
                        className="w-full font-mono text-xs text-foreground bg-background hover:border-foreground/30 focus:border-primary border border-border rounded-lg pl-6 pr-2 py-1.5 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">
                      VAT ({item.vat_rate}%)
                    </span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono pointer-events-none">
                        {sym}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.vat_amount}
                        onChange={handleVatAmountChange}
                        className="w-full font-mono text-xs text-foreground bg-background hover:border-foreground/30 focus:border-primary border border-border rounded-lg pl-6 pr-2 py-1.5 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-muted/30 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Gross Amount</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Net + VAT</span>
                  </div>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono pointer-events-none">
                      {sym}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.gross_amount ?? +(item.net_amount + (item.vat_amount || 0)).toFixed(2)}
                      onChange={handleGrossAmountChange}
                      className="w-full font-mono text-xs font-bold text-foreground bg-background hover:border-foreground/30 focus:border-primary border border-border rounded-lg pl-6 pr-2 py-1.5 outline-none transition-colors text-right"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block">Net Value</span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {formatCurrency(item.net_amount, currency)}
                  </span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5">
                    {item.quantity} × {formatCurrency(item.unit_price, currency)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block">VAT ({item.vat_rate}%)</span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {formatCurrency(item.vat_amount, currency)}
                  </span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5">
                    Gross: {formatCurrency(item.gross_amount, currency)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Foreign VAT Notice (if foreign) */}
          {isItemForeign && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
              <Globe className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-[11px] block">Foreign VAT / Non-Irish</span>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  VAT charged by non-Irish vendors cannot be claimed on Irish VAT3. Coded as <strong>TN</strong> with <strong>€0.00 Claimed VAT</strong>.
                </p>
              </div>
            </div>
          )}

          {/* 6. Section 60 Quick Actions (Staff Entertainment / Resale) */}
          {isEntCandidate && onUpdateItem && (
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Section 60 VAT Recovery
                </span>
                {isStaffEnt && (
                  <Badge variant={isItemForeign ? 'warning' : 'success'} className="text-[10px] py-0 font-bold">
                    Staff Event
                  </Badge>
                )}
                {isResale && (
                  <Badge variant="default" className="text-[10px] py-0 font-bold bg-blue-600 text-white">
                    Resale
                  </Badge>
                )}
                {!isStaffEnt && !isResale && (
                  <Badge variant="destructive" className="text-[10px] py-0 font-bold">Blocked</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  id="btn-inspector-staff-entertainment"
                  disabled={isLocked}
                  onClick={handleApplyStaffEntertainment}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2 ${
                    isLocked
                      ? 'opacity-50 cursor-not-allowed border-border text-muted-foreground'
                      : isStaffEnt
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                      : 'border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-foreground'
                  }`}
                >
                  <Users className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isStaffEnt ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold flex items-center justify-between">
                      <span>Staff Entertainment</span>
                      {isStaffEnt && <span className="text-[10px] text-emerald-600 font-semibold">Claimed</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-snug">
                      Sec 60(2)(b): 100% input VAT claimable. Xero 413.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-inspector-resale-stock"
                  disabled={isLocked}
                  onClick={handleApplyResale}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2 ${
                    isLocked
                      ? 'opacity-50 cursor-not-allowed border-border text-muted-foreground'
                      : isResale
                      ? 'border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500'
                      : 'border-border hover:border-blue-500/50 hover:bg-blue-500/5 text-foreground'
                  }`}
                >
                  <ShoppingCart className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isResale ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold flex items-center justify-between">
                      <span>Stock for Resale</span>
                      {isResale && <span className="text-[10px] text-blue-600 font-semibold">Claimed</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-snug">
                      Sec 60(2)(a): Acquired for resale. Xero 300.
                    </div>
                  </div>
                </button>
              </div>

              {(isStaffEnt || isResale) && !isLocked && (
                <button
                  type="button"
                  onClick={handleRevertToBlocked}
                  className="text-[10px] text-destructive/80 hover:text-destructive underline decoration-dotted w-full text-center block pt-0.5 cursor-pointer"
                >
                  Revert to Client Entertainment (TN Blocked)
                </button>
              )}
            </div>
          )}

          {/* 7. AI Extraction Rationale */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-foreground">
            <div className="flex items-center gap-1.5 font-bold text-primary text-[11px] mb-1">
              <Sparkles className="w-3.5 h-3.5" /> AI Coding Rationale
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
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
