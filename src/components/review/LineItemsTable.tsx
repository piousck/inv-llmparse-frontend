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
import { LineItem, IRISH_VAT_RATES, XERO_ACCOUNT_CODES } from '../../types/api';
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
}) => {
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
    <div className="flex flex-col h-full bg-card rounded-xl border border-border shadow-xs overflow-hidden min-w-0">
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

      {/* Two-Line Line Item Body (Expansive, Never Truncated, Zero Horizontal Scrolling) */}
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
              onClick={() => onSelectIndex(idx)}
              className={cn(
                "p-2.5 transition-all cursor-pointer group flex flex-col gap-1.5",
                isSelected
                  ? "bg-primary/5 ring-1 ring-primary/20 shadow-2xs"
                  : "hover:bg-muted/30"
              )}
            >
              {/* Line 1: Item #, Confidence Dot, Line Description (flex-1), Full GL Code Selector, Delete */}
              <div className="flex items-center gap-2 w-full min-w-0">
                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  <span className="size-5 rounded bg-muted flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  {/* 6px Color Confidence Dot with Tooltip */}
                  <span
                    className={cn(
                      "size-2 rounded-full shrink-0",
                      conf >= 0.85 ? "bg-emerald-500" : conf >= 0.6 ? "bg-amber-500" : "bg-destructive"
                    )}
                    title={`AI Confidence: ${Math.round(conf * 100)}%`}
                  />
                </div>

                {/* Description Input (wide, never scrolled off) */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.description}
                    disabled={isLocked}
                    placeholder="Line description..."
                    onChange={(e) => onChangeLineItem(idx, { description: e.target.value })}
                    onFocus={() => onSelectIndex(idx)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIndex(idx);
                    }}
                    className={cn(
                      "w-full px-2 py-1 text-xs font-medium text-foreground bg-background/50 hover:bg-background focus:bg-background border border-transparent hover:border-border focus:border-primary rounded transition-all truncate",
                      isLocked && "cursor-pointer pointer-events-none opacity-90"
                    )}
                  />
                </div>

                {/* Nominal Ledger GL Code Selector (wide, full text visible) */}
                <div className="w-48 sm:w-56 shrink-0">
                  <select
                    value={item.xero_account_code}
                    disabled={isLocked}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      const isS60 = newCode === '413';
                      onChangeLineItem(idx, {
                        xero_account_code: newCode,
                        vat_deductible: !isS60,
                        vat_code: isS60 ? 'TN' : item.vat_code === 'TN' ? 'T23' : item.vat_code,
                      });
                    }}
                    onFocus={() => onSelectIndex(idx)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIndex(idx);
                    }}
                    className={cn(
                      "w-full px-2 py-1 text-xs font-normal text-foreground bg-card border border-border rounded focus:border-primary cursor-pointer truncate",
                      isLocked && "cursor-pointer pointer-events-none opacity-80 bg-muted/40 border-border/50"
                    )}
                    title="Nominal Ledger GL Account Code"
                  >
                    {XERO_ACCOUNT_CODES.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} · {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delete button (visible on hover) */}
                {!isLocked && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveLineItem(idx);
                    }}
                    className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                    title="Delete item"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Line 2: Numeric Values (Qty, Net, VAT Rate, Claimed VAT) + Smart Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pl-6.5 text-xs text-muted-foreground w-full">
                <div className="flex items-center gap-2.5 flex-wrap">
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
                      className="w-11 px-1 py-0.5 text-center font-mono text-xs bg-background/50 border border-border/60 rounded text-foreground"
                    />
                  </div>

                  {/* Net (€) */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Net:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.net_amount}
                      disabled={isLocked}
                      onChange={(e) => handleNetAmountChange(idx, parseFloat(e.target.value) || 0)}
                      onFocus={() => onSelectIndex(idx)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIndex(idx);
                      }}
                      className="w-20 px-1.5 py-0.5 text-right font-mono text-xs font-semibold bg-background/50 border border-border/60 rounded text-foreground"
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
                      className="w-24 px-1 py-0.5 text-xs font-mono bg-card border border-border/60 rounded text-foreground cursor-pointer"
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
                        "text-xs font-bold",
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
                <div className="flex items-center gap-1.5 flex-wrap">
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
            </div>
          );
        })}
      </div>

      {/* Sticky Reconciliation Summary Strip (Always Visible, Comparing Extracted vs Expected) */}
      <div className="shrink-0 px-3.5 py-2 border-t border-border bg-card/90 backdrop-blur-xs flex items-center justify-between gap-2 text-xs font-mono select-none">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-sans mr-1">Net:</span>
            <span className="font-bold text-foreground">{formatCurrency(totalNet, _currency)}</span>
          </div>
          <div className="h-3 w-px bg-border shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-sans mr-1">VAT:</span>
            <span className="font-bold text-muted-foreground">{formatCurrency(totalVat, _currency)}</span>
          </div>
          <div className="h-3 w-px bg-border shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-sans mr-1">Claimed:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalClaimedVat, _currency)}</span>
          </div>
          <div className="h-3 w-px bg-border shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-sans mr-1">Total:</span>
            <span className="font-extrabold text-foreground">{formatCurrency(totalGross, _currency)}</span>
          </div>
        </div>

        {/* Variance vs Document Header */}
        {expectedGross !== undefined && (
          <div className="flex items-center gap-1.5 font-sans shrink-0">
            {Math.abs(totalGross - expectedGross) < 0.02 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Check className="w-3 h-3" /> Balanced
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"
                title={`Expected Doc Total: ${formatCurrency(expectedGross, _currency)} vs Lines Total: ${formatCurrency(totalGross, _currency)}`}
              >
                <AlertTriangle className="w-3 h-3" /> Δ {formatCurrency(Math.abs(totalGross - expectedGross), _currency)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
