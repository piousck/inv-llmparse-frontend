import React, { useState } from 'react';
import { Globe, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';

interface NonIrishPurchaseBannerProps {
  sellerName?: string;
  sellerVat?: string;
  currency?: string;
  claimedVat: number;
  documentVat: number;
  onSetAllForeignUnclaimable?: () => void;
  isAllUnclaimable?: boolean;
}

export const NonIrishPurchaseBanner: React.FC<NonIrishPurchaseBannerProps> = ({
  sellerName,
  sellerVat,
  currency: _currency,
  claimedVat,
  documentVat,
  onSetAllForeignUnclaimable,
  isAllUnclaimable = true,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-xs animate-in fade-in duration-200">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
          <Globe className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-sm text-foreground">
              Non-Irish Purchase Detected (Foreign VAT Unclaimable)
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
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold font-mono text-[10px]">
              TN · Non-Deductible
            </span>
          </div>
          {showDetails && (
            <p className="text-muted-foreground leading-relaxed text-xs max-w-2xl mt-1 animate-in fade-in duration-150">
              Supplier <strong className="text-foreground font-semibold">{sellerName || 'Foreign Supplier'}</strong>
              {sellerVat ? <> (VAT: <span className="font-mono text-foreground font-semibold">{sellerVat}</span>)</> : ''} is registered outside Ireland.
              Under <strong>Irish VAT Consolidation Act 2010 (Sections 59 & 60)</strong>, foreign input VAT charged by non-Irish suppliers <strong>cannot be claimed on an Irish VAT3 return</strong>.
              This invoice is coded as <strong>TN</strong> (Excluded from Irish RTD) with <strong>€0.00 Claimed VAT</strong>.
            </p>
          )}
        </div>
      </div>

      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-amber-500/20 pt-2 sm:pt-0 sm:pl-4 w-full sm:w-auto">
        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            VAT3 Claimed Figure
          </span>
          <span className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">
            {formatCurrency(claimedVat)}
          </span>
          {documentVat > 0 && (
            <span className="text-[10px] text-muted-foreground block">
              Doc VAT: {formatCurrency(documentVat)} (Unclaimable)
            </span>
          )}
        </div>

        {!isAllUnclaimable && onSetAllForeignUnclaimable && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSetAllForeignUnclaimable}
            className="text-xs h-7.5 px-2.5 gap-1.5 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
          >
            Set All to €0.00 / TN
          </Button>
        )}
      </div>
    </div>
  );
};
