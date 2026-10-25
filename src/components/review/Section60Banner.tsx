import React, { useState } from 'react';
import { AlertTriangle, ShoppingCart, CheckCircle2, Users, Info } from 'lucide-react';
import { Button } from '../ui/Button';

interface Section60BannerProps {
  hasSection60Warning: boolean;
  itemCount: number;
  onApplyStaffEntertainment: () => void;
  onApplyResaleException: () => void;
  onRevertToBlocked?: () => void;
  appliedType?: 'staff_entertainment' | 'resale' | null;
  isForeignPurchase?: boolean;
}

export const Section60Banner: React.FC<Section60BannerProps> = ({
  hasSection60Warning,
  itemCount,
  onApplyStaffEntertainment,
  onApplyResaleException,
  onRevertToBlocked,
  appliedType = null,
  isForeignPurchase = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!hasSection60Warning && !appliedType) return null;

  if (appliedType) {
    return (
      <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex flex-wrap items-center justify-between gap-3 text-sm animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span className="text-xs leading-relaxed">
            {appliedType === 'staff_entertainment' ? (
              isForeignPurchase ? (
                <>
                  <strong className="text-foreground">Staff Entertainment Reclassification (Non-Domestic):</strong> {itemCount} line item{itemCount > 1 ? 's' : ''} reclassified to <strong className="text-foreground">Xero 413</strong>. Foreign VAT remains unclaimable on Irish VAT3 (TN, €0.00 / £0.00 claimed).
                </>
              ) : (
                <>
                  <strong className="text-foreground">Section 60(2)(b) Staff Entertainment Applied:</strong> Input VAT claimed on {itemCount} line item{itemCount > 1 ? 's' : ''} (Xero 413, corporation tax non-deductible under Sec 840).
                </>
              )
            ) : isForeignPurchase ? (
              <>
                <strong className="text-foreground">Stock for Resale Reclassification (Non-Domestic):</strong> Reclassified {itemCount} line item{itemCount > 1 ? 's' : ''} to <strong className="text-foreground">Xero 300 Purchases</strong>. Corporation Tax deductible, but foreign VAT remains unclaimable on Irish VAT3 (TN, €0.00 / £0.00 claimed).
              </>
            ) : (
              <>
                <strong className="text-foreground">Section 60(2)(a) Stock for Resale Applied:</strong> Reclassified {itemCount} line item{itemCount > 1 ? 's' : ''} to <strong className="text-foreground">Xero 300 Purchases</strong>. 100% Input VAT & Corporation Tax deductible.
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={appliedType === 'staff_entertainment' ? onApplyResaleException : onApplyStaffEntertainment}
            className="text-xs h-7.5 px-2.5 gap-1 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/15"
          >
            {appliedType === 'staff_entertainment' ? (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Switch to Stock for Resale</span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5" />
                <span>Switch to Staff Entertainment</span>
              </>
            )}
          </Button>
          {onRevertToBlocked && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRevertToBlocked}
              className="text-xs h-7.5 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Revert to Section 60(1) Non-Deductible Client Entertainment (TN)"
            >
              Revert to Blocked (TN)
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-950 dark:text-amber-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 text-sm shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-900 dark:text-amber-100 text-base">
              {isForeignPurchase
                ? 'Non-Domestic Purchase — Irish VAT Unclaimable (TN)'
                : 'Irish Statutory Section 60(1) VATCA 2010 Notice'}
            </span>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center justify-center p-1 rounded-full hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
              title={showDetails ? 'Hide warning details' : 'Show warning details'}
              aria-label={showDetails ? 'Hide warning details' : 'Show warning details'}
              aria-expanded={showDetails}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          {showDetails && (
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed max-w-2xl animate-in fade-in duration-150">
              {isForeignPurchase
                ? `${itemCount} line item${itemCount > 1 ? 's are' : ' is'} from a non-domestic supplier. Under Section 59/60 VATCA 2010, foreign VAT cannot be claimed on your domestic VAT3 return. You may reclassify lines to Staff Entertainment (413) or Stock for Resale (300) for GL/CT reporting, but Claimed VAT remains 0.00.`
                : `${itemCount} line item${itemCount > 1 ? 's are' : ' is'} classified as Food, Drink or Entertainment. Input VAT is legally blocked (TN) unless incurred for staff entertainment or acquired as stock for resale.`}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <Button
          id="btn-claim-staff-entertainment"
          variant="outline"
          size="sm"
          onClick={onApplyStaffEntertainment}
          className="gap-1.5 shadow-xs text-xs font-bold py-2 px-3 bg-card hover:bg-muted border-amber-500/40 text-foreground cursor-pointer"
          title={
            isForeignPurchase
              ? 'Reclassify to 413 Staff Entertainment (Foreign VAT unclaimable on VAT3)'
              : 'Claim Input VAT under Section 60(2)(b) for staff-only social events & parties'
          }
        >
          <Users className="w-4 h-4 text-primary" />
          <span>{isForeignPurchase ? 'Staff Entertainment (No VAT Claim)' : 'Staff Entertainment (Claim VAT)'}</span>
        </Button>
        <Button
          id="btn-set-all-resale"
          variant="warning"
          size="sm"
          onClick={onApplyResaleException}
          className="gap-1.5 shadow-xs text-xs font-black uppercase tracking-wide cursor-pointer py-2 px-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950"
          title={
            isForeignPurchase
              ? 'Reclassify to Xero 300 Purchases (CT deductible; foreign VAT unclaimable on VAT3)'
              : 'Reclassify to Xero 300 Purchases (Cost of Goods Sold) for goods acquired for resale'
          }
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{isForeignPurchase ? 'Stock for Resale (300 · No VAT)' : 'Stock for Resale (Xero 300)'}</span>
        </Button>
      </div>
    </div>
  );
};
