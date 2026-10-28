import React from 'react';
import {
  Trash2,
  Plus,
  Lock,
  ShieldAlert,
  Users,
  ShoppingBag,
  Check,
  AlertTriangle,
  Package,
  Globe,
  Sparkles,
  Truck,
} from 'lucide-react';
import { LineItem, IRISH_VAT_RATES, XERO_ACCOUNT_CODES, OrganizationGLAccount } from '../../types/api';
import { formatCurrency, cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface LineItemsTableProps {
  lineItems: LineItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onChangeLineItem: (index: number, updated: Partial<LineItem>) => void;
  onAddLineItem: () => void;
  onRemoveLineItem: (index: number) => void;
  isForeignPurchase?: boolean;
  currency?: string;
  capitalizationThreshold?: number;
  isLocked?: boolean;
  expectedGross?: number;
  expectedVat?: number;
  expectedNet?: number;
  isDocExpanded?: boolean;
  onRestoreNormalWidth?: () => void;
  glAccounts?: OrganizationGLAccount[];
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({
  lineItems,
  selectedIndex,
  onSelectIndex,
  onChangeLineItem,
  onAddLineItem,
  onRemoveLineItem,
  isForeignPurchase = false,
  currency: _currency = 'EUR',
  capitalizationThreshold = 500,
  isLocked = false,
  expectedGross,
  isDocExpanded = false,
  onRestoreNormalWidth,
  glAccounts,
}) => {
  const availableAccounts = React.useMemo(() => {
    const list: { code: string; name: string; category?: string }[] = [];
    const seen = new Set<string>();

    if (glAccounts && glAccounts.length > 0) {
      for (const a of glAccounts) {
        if (a.is_active !== false && !seen.has(a.code)) {
          seen.add(a.code);
          list.push({ code: a.code, name: a.name, category: a.category });
        }
      }
    } else {
      for (const a of XERO_ACCOUNT_CODES) {
        if (!seen.has(a.code)) {
          seen.add(a.code);
          list.push({ code: a.code, name: a.name, category: a.category });
        }
      }
    }

    // Ensure any current line item code is included even if custom
    for (const item of lineItems) {
      if (item.xero_account_code && !seen.has(item.xero_account_code)) {
        seen.add(item.xero_account_code);
        list.push({
          code: item.xero_account_code,
          name: item.xero_expense_category || 'Custom Account',
          category: item.xero_expense_category || 'Operating Expense',
        });
      }
    }

    return list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [glAccounts, lineItems]);
  const handleRateChange = (index: number, vatCode: string) => {
    const rateDef = IRISH_VAT_RATES.find((r) => r.code === vatCode);
    const item = lineItems[index];
    const rate = rateDef ? rateDef.rate : 0.0;
    const isDeductible = !isForeignPurchase && vatCode !== 'TN';
    const currentGross = item.gross_amount ?? +(item.net_amount + (item.vat_amount || 0)).toFixed(2);

    let newNet: number;
    let newVat: number;

    if (currentGross > 0 && Math.abs(currentGross - item.net_amount) < 0.01 && rate > 0) {
      newNet = +(currentGross / (1 + rate / 100)).toFixed(2);
      newVat = +(currentGross - newNet).toFixed(2);
    } else {
      newNet = item.net_amount;
      newVat = +(item.net_amount * (rate / 100)).toFixed(2);
    }

    const newGross = +(newNet + newVat).toFixed(2);

    onChangeLineItem(index, {
      vat_code: vatCode,
      vat_rate: rate,
      vat_amount: newVat,
      net_amount: newNet,
      gross_amount: newGross,
      vat_deductible: isDeductible,
    });
  };

  const handleQtyChange = (index: number, quantity: number) => {
    const item = lineItems[index];
    const unitPrice = item.unit_price || (quantity > 0 ? +(item.net_amount / quantity).toFixed(2) : item.net_amount);
    const newNet = +(quantity * unitPrice).toFixed(2);
    const rate = item.vat_rate || 0.0;
    const newVat = +(newNet * (rate / 100)).toFixed(2);
    const newGross = +(newNet + newVat).toFixed(2);

    onChangeLineItem(index, {
      quantity,
      unit_price: unitPrice,
      net_amount: newNet,
      vat_amount: newVat,
      gross_amount: newGross,
    });
  };

  const handleNetAmountChange = (index: number, netAmount: number) => {
    const item = lineItems[index];
    const rate = item.vat_rate || 0.0;
    const newVat = +(netAmount * (rate / 100)).toFixed(2);
    const newGross = +(netAmount + newVat).toFixed(2);
    const qty = item.quantity || 1;
    const newUnitPrice = +(netAmount / qty).toFixed(2);

    onChangeLineItem(index, {
      net_amount: netAmount,
      vat_amount: newVat,
      gross_amount: newGross,
      unit_price: newUnitPrice,
    });
  };

  const handleApplyStaffEntertainment = (index: number) => {
    const item = lineItems[index];
    const gross = item.gross_amount ?? +(item.net_amount + (item.vat_amount || 0)).toFixed(2);

    if (isForeignPurchase) {
      onChangeLineItem(index, {
        xero_account_code: '413',
        xero_expense_category: 'Expenses',
        entertainment_context: 'staff_entertainment',
        vat_deductible: false,
        income_tax_deductible: false,
        vat_code: 'TN',
        vat_rate: 0.0,
        net_amount: gross,
        vat_amount: 0.0,
        gross_amount: gross,
        tax_treatment_notes:
          'Non-domestic purchase: Foreign VAT cannot be claimed on Irish VAT3 (TN). Reclassified to 413 Staff Entertainment (CT non-deductible).',
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
    const netAmount = +(gross / (1 + statutoryRate / 100)).toFixed(2);
    const vatAmount = +(gross - netAmount).toFixed(2);

    onChangeLineItem(index, {
      xero_account_code: '413',
      xero_expense_category: 'Expenses',
      entertainment_context: 'staff_entertainment',
      vat_deductible: true,
      income_tax_deductible: false,
      vat_code: vatCode,
      vat_rate: statutoryRate,
      net_amount: netAmount,
      vat_amount: vatAmount,
      gross_amount: gross,
      tax_treatment_notes:
        'Section 60(2)(b) staff entertainment: Input VAT claimable, CT non-deductible (Sec 840).',
    });
  };

  const handleApplyResaleStock = (index: number) => {
    const item = lineItems[index];
    const gross = item.gross_amount ?? +(item.net_amount + (item.vat_amount || 0)).toFixed(2);

    if (isForeignPurchase) {
      onChangeLineItem(index, {
        xero_account_code: '300',
        xero_expense_category: 'Direct Costs',
        entertainment_context: 'not_applicable',
        vat_deductible: false,
        income_tax_deductible: true,
        vat_code: 'TN',
        vat_rate: 0.0,
        net_amount: gross,
        vat_amount: 0.0,
        gross_amount: gross,
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
    const netAmount = +(gross / (1 + statutoryRate / 100)).toFixed(2);
    const vatAmount = +(gross - netAmount).toFixed(2);

    onChangeLineItem(index, {
      xero_account_code: '300',
      xero_expense_category: 'Direct Costs',
      entertainment_context: 'not_applicable',
      vat_deductible: true,
      income_tax_deductible: true,
      vat_code: vatCode,
      vat_rate: statutoryRate,
      net_amount: netAmount,
      vat_amount: vatAmount,
      gross_amount: gross,
      tax_treatment_notes:
        'Section 60(2)(a) stock-in-trade resale exception: Input VAT & CT deductible.',
    });
  };

  const handleRevertToBlocked = (index: number) => {
    const item = lineItems[index];
    const gross = item.gross_amount ?? +(item.net_amount + (item.vat_amount || 0)).toFixed(2);
    onChangeLineItem(index, {
      xero_account_code: '413',
      xero_expense_category: 'Expenses',
      entertainment_context: 'client_entertainment',
      vat_deductible: false,
      income_tax_deductible: false,
      vat_code: 'TN',
      net_amount: gross,
      vat_amount: 0.0,
      gross_amount: gross,
      tax_treatment_notes: isForeignPurchase
        ? 'Non-domestic purchase: Foreign VAT unclaimable on Irish VAT3 (TN).'
        : 'Section 60(1) client entertainment: VAT blocked (TN).',
    });
  };

  // Totals calculations
  const totalNet = +(lineItems.reduce((acc, item) => acc + (item.net_amount || 0), 0)).toFixed(2);
  const totalVat = +(lineItems.reduce((acc, item) => acc + (item.vat_amount || 0), 0)).toFixed(2);
  const totalClaimedVat = +(lineItems.reduce((acc, item) => acc + (item.vat_deductible ? (item.vat_amount || 0) : 0), 0)).toFixed(2);
  const totalGross = +(lineItems.reduce((acc, item) => {
    const g = item.gross_amount ?? (item.net_amount + (item.vat_amount || 0));
    return acc + g;
  }, 0)).toFixed(2);

  return (
    <div
      onClick={() => {
        if (isDocExpanded && onRestoreNormalWidth) {
          onRestoreNormalWidth();
        }
      }}
      className={cn(
        "flex flex-col h-full bg-card rounded-xl border border-border shadow-xs overflow-hidden min-w-0 transition-all",
        isDocExpanded && "cursor-pointer"
      )}
    >
      {/* Table Header / Action */}
      <div className="h-10 shrink-0 flex items-center justify-between px-3.5 border-b border-border bg-card/80 backdrop-blur-xs select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">Extracted Line Items</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
            {lineItems.length} items
          </span>
          {isLocked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold inline-flex items-center gap-1 border border-amber-500/30">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}
        </div>

        {!isLocked && (
          <Button variant="outline" size="sm" onClick={onAddLineItem} className="h-7 text-xs gap-1 px-2.5">
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </Button>
        )}
      </div>

      {/* Column Headings Bar (Matches Screenshot) */}
      <div className="h-7 shrink-0 px-3 flex items-center gap-2 border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
        <div className="w-7 shrink-0 text-center">#</div>
        <div className="flex-1 min-w-0">Item Description</div>
        <div className={cn(isDocExpanded ? "w-16 shrink-0 text-center" : "w-44 sm:w-52 shrink-0")}>
          {isDocExpanded ? "GL" : "GL Account"}
        </div>
        <div className="w-20 shrink-0 text-right pr-1">Net</div>
      </div>

      {/* Compact Line Item Body (Reduced Size Inside, Selected Row Expanded) */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/60">
        {lineItems.map((item, idx) => {
          const isSelected = selectedIndex === idx;
          const conf = item.confidence || 0.94;
          const desc = (item.description || '').toLowerCase();

          // Section 60 Entertainment Badges & 1-Click Claim Buttons
          const isStaffEntClaimed = item.entertainment_context === 'staff_entertainment';
          const isResaleClaimed =
            item.tax_treatment_notes?.includes('Section 60(2)(a)') ||
            (item.xero_account_code === '300' && item.tax_treatment_notes?.includes('resale'));
          const isSection60Blocked =
            !isStaffEntClaimed &&
            !isResaleClaimed &&
            (item.xero_account_code === '413' ||
              (item.xero_account_code === '429' && !item.vat_deductible) ||
              item.vat_code === 'TN' ||
              item.entertainment_context === 'client_entertainment' ||
              item.entertainment_context === 'mixed_or_unclear');

          // Asset Capitalization Policy checks
          const isFixedAssetCode = ['710', '711', '720', '721', '740', '741', '760', '761', '764', '769'].includes(item.xero_account_code || '');
          const netVal = item.net_amount ?? item.net_value ?? (item.quantity * item.unit_price);
          const isUnderCapThreshold = netVal !== undefined && netVal < capitalizationThreshold && netVal >= 0;
          const isExpensedUnderPolicy =
            item.tax_treatment_notes?.toLowerCase().includes('de minimis') ||
            item.tax_treatment_notes?.toLowerCase().includes('capitalization threshold');

          const isItemForeign =
            isForeignPurchase ||
            item.tax_treatment_notes?.toLowerCase().includes('foreign') ||
            item.tax_treatment_notes?.toLowerCase().includes('non-irish') ||
            item.reasoning?.toLowerCase().includes('foreign');

          const isNetGrossMatch =
            Math.abs((item.gross_amount || 0) - item.net_amount) <= 0.02 &&
            item.vat_rate > 0 &&
            item.net_amount > 0;
          const isDeposit =
            ['deposit', 're-turn', 'returnable', 'povratna', 'naknada', 'drs'].some((k) => desc.includes(k)) &&
            item.vat_rate > 0;
          const isFinancial =
            ['surcharge', 'card fee', 'merchant fee', 'handling fee'].some((k) => desc.includes(k)) &&
            item.vat_rate > 0;
          const isShipping =
            ['shipping', 'delivery', 'freight', 'carriage', 'postage', 'courier'].some((k) => desc.includes(k)) &&
            item.vat_rate > 0;

          return (
            <div
              key={item.id || idx}
              onClick={() => {
                if (isDocExpanded && onRestoreNormalWidth) onRestoreNormalWidth();
                onSelectIndex(idx);
              }}
              className={cn(
                "px-3 py-1.5 transition-all cursor-pointer group flex flex-col gap-1",
                isSelected
                  ? "bg-sky-50/70 dark:bg-sky-950/25 ring-1 ring-sky-300 dark:ring-sky-700/60 shadow-2xs"
                  : "hover:bg-muted/25"
              )}
            >
              {/* Line 1: Index + Dot, Description, GL Account, Net Amount */}
              <div className="flex items-center gap-2 w-full min-w-0">
                {/* Index + Confidence indicator */}
                <div className="flex items-center gap-1 shrink-0 select-none w-7 justify-start">
                  <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span
                    className={cn(
                      "size-1.5 rounded-full shrink-0",
                      conf >= 0.85 ? "bg-emerald-500" : conf >= 0.6 ? "bg-amber-500" : "bg-destructive"
                    )}
                    title={`AI Confidence: ${Math.round(conf * 100)}%`}
                  />
                </div>

                {/* Description Input (reduced font size text-[11px]) */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.description}
                    disabled={isLocked}
                    placeholder="Line description..."
                    onChange={(e) => onChangeLineItem(idx, { description: e.target.value })}
                    onFocus={() => {
                      if (isDocExpanded && onRestoreNormalWidth) onRestoreNormalWidth();
                      onSelectIndex(idx);
                    }}
                    onClick={(e) => {
                      if (isDocExpanded && onRestoreNormalWidth) onRestoreNormalWidth();
                      e.stopPropagation();
                      onSelectIndex(idx);
                    }}
                    className={cn(
                      "w-full px-2 py-0.5 h-7 text-[11px] font-medium text-foreground bg-background/50 hover:bg-background focus:bg-background border border-transparent hover:border-border focus:border-primary rounded transition-all truncate",
                      isLocked && "cursor-pointer pointer-events-none opacity-90"
                    )}
                  />
                </div>

                {/* Nominal Ledger GL Code Selector (compact h-7, text-[11px]) */}
                <div className={cn(isDocExpanded ? "w-16 shrink-0" : "w-44 sm:w-52 shrink-0")}>
                  <select
                    value={item.xero_account_code || ''}
                    disabled={isLocked}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      const selected = availableAccounts.find((x) => x.code === newCode);
                      const isS60 = newCode === '413';
                      onChangeLineItem(idx, {
                        xero_account_code: newCode,
                        xero_expense_category: selected ? selected.category : item.xero_expense_category,
                        vat_deductible: !isS60,
                        vat_code: isS60 ? 'TN' : item.vat_code === 'TN' ? 'T23' : item.vat_code,
                      });
                    }}
                    onFocus={() => {
                      if (isDocExpanded && onRestoreNormalWidth) onRestoreNormalWidth();
                      onSelectIndex(idx);
                    }}
                    onClick={(e) => {
                      if (isDocExpanded && onRestoreNormalWidth) onRestoreNormalWidth();
                      e.stopPropagation();
                      onSelectIndex(idx);
                    }}
                    className={cn(
                      "w-full px-1.5 py-0.5 h-7 text-[11px] font-normal text-foreground bg-card border border-border rounded focus:border-primary cursor-pointer truncate",
                      isDocExpanded ? "text-center font-mono font-semibold px-1" : "",
                      isLocked && "cursor-pointer pointer-events-none opacity-80 bg-muted/40 border-border/50"
                    )}
                    title={
                      isDocExpanded
                        ? `GL Account: ${item.xero_account_code || ''} (${item.xero_expense_category || ''})`
                        : "Nominal Ledger GL Account Code"
                    }
                  >
                    {availableAccounts.map((acc) => (
                      <option key={acc.code} value={acc.code} title={`${acc.code} - ${acc.name}`}>
                        {isDocExpanded ? acc.code : `${acc.code} - ${acc.name}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Net Amount (under NET header) */}
                <div className="w-20 shrink-0 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={item.net_amount}
                    disabled={isLocked}
                    onChange={(e) => handleNetAmountChange(idx, parseFloat(e.target.value) || 0)}
                    onFocus={() => {
                      if (isDocExpanded && onRestoreNormalWidth) onRestoreNormalWidth();
                      onSelectIndex(idx);
                    }}
                    onClick={(e) => {
                      if (isDocExpanded && onRestoreNormalWidth) onRestoreNormalWidth();
                      e.stopPropagation();
                      onSelectIndex(idx);
                    }}
                    className={cn(
                      "w-full px-1.5 py-0.5 h-7 text-right font-mono text-[11px] font-semibold text-foreground bg-transparent hover:bg-background/80 focus:bg-background border border-transparent hover:border-border focus:border-primary rounded transition-all",
                      isLocked && "pointer-events-none opacity-90"
                    )}
                    title="Net Amount (EUR)"
                  />
                </div>

                {/* Delete button (visible on hover) */}
                {!isLocked && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveLineItem(idx);
                    }}
                    className="size-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                    title="Delete item"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>

              {/* Line 2: Only displayed when row is Selected or Focused, exactly matching the screenshot */}
              {isSelected && (
                <div className="flex flex-wrap items-center justify-between gap-1.5 pl-8 text-[10px] text-muted-foreground w-full pt-0.5 border-t border-sky-200/50 dark:border-sky-800/40">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Quantity */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">Qty:</span>
                      <input
                        type="number"
                        value={item.quantity}
                        disabled={isLocked}
                        onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                        onFocus={() => onSelectIndex(idx)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIndex(idx);
                        }}
                        className="w-10 h-5 px-1 py-0 text-center font-mono text-[10px] bg-background border border-border rounded text-foreground"
                      />
                    </div>

                    {/* Irish VAT Rate */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">VAT:</span>
                      <select
                        value={item.vat_code}
                        disabled={isLocked}
                        onChange={(e) => handleRateChange(idx, e.target.value)}
                        onFocus={() => onSelectIndex(idx)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIndex(idx);
                        }}
                        className="h-5 px-1.5 py-0 text-[10px] font-mono bg-card border border-border rounded text-foreground cursor-pointer"
                      >
                        {IRISH_VAT_RATES.map((rate) => (
                          <option key={rate.code} value={rate.code}>
                            {rate.code} ({rate.rate}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Statutory Claimed VAT */}
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-[10px] text-muted-foreground font-sans">Claimed:</span>
                      <span
                        className={cn(
                          "text-[10px] font-bold",
                          item.vat_deductible && Math.abs(item.vat_amount || 0) > 0.01
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatCurrency(item.vat_deductible ? item.vat_amount : 0, _currency)}
                      </span>
                      {!item.vat_deductible && Math.abs(item.vat_amount || 0) > 0.01 && (
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-sans truncate" title={`Doc VAT: ${formatCurrency(item.vat_amount, _currency)} unclaimable on VAT3`}>
                          ({formatCurrency(item.vat_amount, _currency)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Smart Badges & 1-Click Tax Treatments */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {isSection60Blocked && (
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-destructive dark:text-rose-400 bg-destructive/10 px-1.5 py-0.5 rounded shrink-0">
                          <ShieldAlert className="w-2.5 h-2.5 text-destructive" /> S.60 Blocked
                        </span>
                        {!isLocked && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyStaffEntertainment(idx);
                              }}
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 px-1.5 py-0.5 rounded transition-colors shrink-0"
                              title="Section 60(2)(b): Staff entertainment is 100% input VAT claimable"
                            >
                              <Users className="w-2.5 h-2.5" /> Staff Event
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyResaleStock(idx);
                              }}
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 px-1.5 py-0.5 rounded transition-colors shrink-0"
                              title="Section 60(2)(a): Acquired for resale"
                            >
                              <ShoppingBag className="w-2.5 h-2.5" /> Resale
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {isStaffEntClaimed && (
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded shrink-0">
                          <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /> S.60 Staff Event
                        </span>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevertToBlocked(idx);
                            }}
                            className="text-[9px] text-destructive/80 hover:text-destructive underline decoration-dotted shrink-0"
                          >
                            Revert
                          </button>
                        )}
                      </div>
                    )}

                    {isResaleClaimed && (
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/15 px-1.5 py-0.5 rounded shrink-0">
                          <Check className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" /> S.60 Resale
                        </span>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevertToBlocked(idx);
                            }}
                            className="text-[9px] text-destructive/80 hover:text-destructive underline decoration-dotted shrink-0"
                          >
                            Revert
                          </button>
                        )}
                      </div>
                    )}

                    {isFixedAssetCode && isUnderCapThreshold && (
                      <div className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> Cap &lt; €{capitalizationThreshold}
                        </span>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onChangeLineItem(idx, {
                                xero_account_code: '420',
                                xero_expense_category: 'Operating Expense',
                                tax_treatment_notes: `Expensed under de minimis threshold (< €${capitalizationThreshold})`,
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 dark:text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 px-1.5 py-0.5 rounded transition-colors cursor-pointer shrink-0"
                          >
                            <Package className="w-2.5 h-2.5" /> Expense 420
                          </button>
                        )}
                      </div>
                    )}

                    {isExpensedUnderPolicy && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded shrink-0">
                        <Check className="w-2.5 h-2.5 text-emerald-600" /> Expensed (&lt; €{capitalizationThreshold})
                      </span>
                    )}

                    {isItemForeign && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded shrink-0">
                        <Globe className="w-2.5 h-2.5 text-amber-600" /> Non-Irish (TN)
                      </span>
                    )}

                    {!isLocked && isNetGrossMatch && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRateChange(idx, 'T0');
                        }}
                        className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 px-1.5 py-0.5 rounded transition-colors shrink-0"
                        title="Gross equals net (0% VAT charged)"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Net=Gross · Set 0%
                      </button>
                    )}

                    {!isLocked && isDeposit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRateChange(idx, 'T0');
                        }}
                        className="inline-flex items-center gap-1 text-[9px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 px-1.5 py-0.5 rounded transition-colors shrink-0"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-blue-500" /> DRS · Set 0%
                      </button>
                    )}

                    {!isLocked && isFinancial && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRateChange(idx, 'TE');
                        }}
                        className="inline-flex items-center gap-1 text-[9px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 px-1.5 py-0.5 rounded transition-colors shrink-0"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-purple-500" /> Surcharge · Set TE
                      </button>
                    )}

                    {!isLocked && isShipping && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRateChange(idx, 'T0');
                        }}
                        className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground bg-muted hover:bg-muted/80 px-1.5 py-0.5 rounded transition-colors shrink-0"
                      >
                        <Truck className="w-2.5 h-2.5 text-muted-foreground" /> Shipping · Set 0%
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Totals Section in Cards (Requested by User) */}
      <div className="shrink-0 p-2.5 border-t border-border bg-card/90 backdrop-blur-xs select-none">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {/* Card 1: Net Total */}
          <div className="bg-background/80 border border-border/80 rounded-lg px-2.5 py-1.5 flex flex-col justify-between shadow-2xs">
            <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
              Net Amount
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {formatCurrency(totalNet, _currency)}
            </span>
          </div>

          {/* Card 2: VAT Total */}
          <div className="bg-background/80 border border-border/80 rounded-lg px-2.5 py-1.5 flex flex-col justify-between shadow-2xs">
            <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
              VAT Total
            </span>
            <span className="font-mono text-xs font-bold text-muted-foreground">
              {formatCurrency(totalVat, _currency)}
            </span>
          </div>

          {/* Card 3: Claimed VAT */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 flex flex-col justify-between shadow-2xs">
            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 tracking-wider uppercase">
              Claimed VAT
            </span>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalClaimedVat, _currency)}
            </span>
          </div>

          {/* Card 4: Invoice Total / Balanced */}
          <div className="bg-background/80 border border-border/80 rounded-lg px-2.5 py-1.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                Invoice Total
              </span>
              {expectedGross !== undefined && (
                Math.abs(totalGross - expectedGross) < 0.02 ? (
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    ✓ Balanced
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                    Δ {formatCurrency(Math.abs(totalGross - expectedGross), _currency)}
                  </span>
                )
              )}
            </div>
            <span className="font-mono text-xs font-extrabold text-foreground">
              {formatCurrency(totalGross, _currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
