import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  Save,
  Check,
  AlertCircle,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
  RefreshCw,
  Unlock,
  Lock,
  Banknote,
  FileText,
  List,
  Sparkles,
  X,
  MoreVertical,
} from 'lucide-react';
import { InvoiceDetail, LineItem, OrganizationGLAccount } from '../../types/api';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { InvoiceCanvas } from './InvoiceCanvas';
import { LineItemsTable } from './LineItemsTable';
import { Section60Banner } from './Section60Banner';
import { LineItemInspector } from './LineItemInspector';
import { NonIrishPurchaseBanner } from './NonIrishPurchaseBanner';
import { isNonIrishPurchase, formatCurrency, formatSupplierName, cn } from '../../lib/utils';
import { formatAppDate } from '../../lib/dateUtils';

interface ReviewHubProps {
  invoiceId: string;
  activeOrgId?: string;
  invoiceIds?: string[];
  onNavigateInvoice?: (invoiceId: string) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const ReviewHub: React.FC<ReviewHubProps> = ({
  invoiceId,
  activeOrgId,
  invoiceIds,
  onNavigateInvoice,
  onBack,
  onShowToast,
}) => {
  const [currentId, setCurrentId] = useState<string>(invoiceId);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [workflowStep, setWorkflowStep] = useState<1 | 2 | 3>(2);
  const [appliedEntertainmentType, setAppliedEntertainmentType] = useState<
    'staff_entertainment' | 'resale' | null
  >(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('invparse_inspector_open');
    return saved !== null ? saved === 'true' : true;
  });
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState<boolean>(false);
  const [cycleInvoiceIds, setCycleInvoiceIds] = useState<string[]>(() => invoiceIds || []);
  const [isReocring, setIsReocring] = useState<boolean>(false);
  const [mobileViewTab, setMobileViewTab] = useState<'canvas' | 'lines' | 'inspector'>('lines');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [glAccounts, setGlAccounts] = useState<OrganizationGLAccount[]>([]);

  useEffect(() => {
    const loadGLAccounts = async () => {
      const orgId = activeOrgId || invoice?.organization_id || apiService.getActiveOrgId();
      if (!orgId) return;
      try {
        const accounts = await apiService.getOrganizationGLAccounts(orgId);
        if (accounts && accounts.length > 0) {
          setGlAccounts(accounts);
        }
      } catch (err) {
        console.warn('Failed to load GL accounts in ReviewHub:', err);
      }
    };
    loadGLAccounts();
  }, [activeOrgId, invoice?.organization_id]);

  // Height alignment: align LineItemInspector bottom with the reconciliation summary box
  const reconcileBoxRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const [inspectorHeight, setInspectorHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const updateInspectorHeight = () => {
      if (reconcileBoxRef.current && inspectorRef.current) {
        const recRect = reconcileBoxRef.current.getBoundingClientRect();
        const inspRect = inspectorRef.current.getBoundingClientRect();
        const targetHeight = Math.round(recRect.bottom - inspRect.top);
        if (targetHeight > 250) {
          setInspectorHeight((prev) => (prev === targetHeight ? prev : targetHeight));
        }
      }
    };

    updateInspectorHeight();
    const rafId = requestAnimationFrame(updateInspectorHeight);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateInspectorHeight();
      });
      if (reconcileBoxRef.current) ro.observe(reconcileBoxRef.current);
      const centerContainer = reconcileBoxRef.current?.closest('.flex-col');
      if (centerContainer) ro.observe(centerContainer);
    }

    window.addEventListener('resize', updateInspectorHeight);
    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener('resize', updateInspectorHeight);
    };
  }, [invoice, selectedLineIndex, isCanvasExpanded, isInspectorOpen]);

  const handleReocr = async () => {
    if (!invoice?.id) return;
    setIsReocring(true);
    try {
      const res = await apiService.reocrInvoice(invoice.id);
      onShowToast('Re-run OCR initiated: re-analyzing document pages...');

      // Immediately unlock the view into Review & Reconciliation (Step 2)
      setWorkflowStep(2);
      setInvoice({
        ...invoice,
        requires_human_review: true,
        is_approved: false,
        status: 'needs_review',
      });

      // Poll until the Celery task completes
      const targetJobId = res?.job_id || invoice.job_id;
      let completed = false;
      let attempts = 0;
      const maxAttempts = 40; // 60s max wait

      while (!completed && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1500));
        attempts++;

        try {
          if (targetJobId) {
            const job = await apiService.getJobStatus(targetJobId);
            const currentStatus = (job.status || '').toLowerCase();
            if (currentStatus === 'completed' || currentStatus === 'needs_review') {
              completed = true;
            } else if (currentStatus === 'failed') {
              throw new Error(job.error_message || 'Re-run OCR failed');
            }
          } else {
            if (attempts >= 4) completed = true;
          }
        } catch (pollErr: any) {
          if (pollErr.message && pollErr.message.includes('failed')) {
            throw pollErr;
          }
          console.warn('[ReviewHub] Poll status warning:', pollErr);
        }
      }

      await loadInvoiceData(invoice.id);
      setWorkflowStep(2);
      onShowToast('OCR completed. Line items updated for review.');
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to trigger re-OCR');
    } finally {
      setIsReocring(false);
    }
  };

  const toggleInspector = () => {
    setIsInspectorOpen((prev) => {
      const next = !prev;
      localStorage.setItem('invparse_inspector_open', String(next));
      return next;
    });
  };

  useEffect(() => {
    setCurrentId(invoiceId);
  }, [invoiceId]);

  useEffect(() => {
    if (invoiceIds && invoiceIds.length > 0) {
      setCycleInvoiceIds(invoiceIds);
      return;
    }
    const fetchOrgInvoiceIds = async () => {
      try {
        const orgId = activeOrgId || apiService.getActiveOrgId();
        if (!orgId) return;
        const res = await apiService.getInvoices(orgId, { page_size: 100 });
        if (res.items && res.items.length > 0) {
          setCycleInvoiceIds(res.items.map((inv) => inv.invoice_id).filter(Boolean) as string[]);
        }
      } catch (err) {
        console.warn('Failed to load invoice list for cycling:', err);
      }
    };
    fetchOrgInvoiceIds();
  }, [activeOrgId, invoiceIds]);

  const currentIndex = cycleInvoiceIds.indexOf(currentId);
  const totalInvoices = cycleInvoiceIds.length;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < cycleInvoiceIds.length - 1;
  const previousId = hasPrevious ? cycleInvoiceIds[currentIndex - 1] : null;
  const nextId = hasNext ? cycleInvoiceIds[currentIndex + 1] : null;

  const navigateTo = (targetId: string) => {
    if (onNavigateInvoice) {
      onNavigateInvoice(targetId);
    } else {
      setCurrentId(targetId);
    }
  };

  const handlePreviousInvoice = () => {
    if (previousId) {
      navigateTo(previousId);
    }
  };

  const handleNextInvoice = () => {
    if (nextId) {
      navigateTo(nextId);
    }
  };

  useEffect(() => {
    loadInvoiceData(currentId);
  }, [currentId]);

  const loadInvoiceData = async (idToLoad: string) => {
    setLoading(true);
    try {
      const inv = await apiService.getInvoiceDetails(idToLoad);
      const claimable = (inv.line_items || [])
        .filter((item) => item.vat_deductible)
        .reduce((acc, item) => acc + (item.vat_amount || 0), 0);
      const computedNet = +(inv.total_gross - claimable).toFixed(2);

      setInvoice({
        ...inv,
        total_net: computedNet,
      });
      setSelectedLineIndex(0);
      setAppliedEntertainmentType(null);
      if (inv.requires_human_review === false) {
        setWorkflowStep(3);
      } else {
        setWorkflowStep(2);
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard navigation shortcuts ([ for prev, ] for next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (e.key === '[' || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        if (previousId) navigateTo(previousId);
      } else if (e.key === ']' || (e.altKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        if (nextId) navigateTo(nextId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previousId, nextId]);

  if (loading || !invoice) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-muted-foreground">Loading invoice review canvas...</span>
        </div>
      </div>
    );
  }

  // Detect food, drink, and entertainment lines on 413 or 429
  const section60Lines = invoice.line_items.filter(
    (item) =>
      item.xero_account_code === '413' ||
      (item.xero_account_code === '429' && !item.vat_deductible) ||
      item.entertainment_context === 'client_entertainment' ||
      item.entertainment_context === 'mixed_or_unclear'
  );
  const hasSection60Warning = section60Lines.length > 0 && !appliedEntertainmentType;

  // Helper to compute dynamic totals strictly adhering to:
  // 1. Claimed VAT = sum of deductible VAT (always 0.00 for non-domestic purchases)
  // 2. Net Figure = Gross - Claimed VAT
  // 3. Gross = Net + Claimed VAT
  const computeInvoiceTotals = (items: LineItem[], fallbackGross?: number) => {
    const rawGross = items.reduce(
      (acc, i) => acc + (i.gross_amount ?? ((i.net_amount || 0) + (i.vat_amount || 0))),
      0
    );
    const totalGross = +(
      fallbackGross && Math.abs(fallbackGross - rawGross) < 0.05
        ? fallbackGross
        : rawGross
    ).toFixed(2);
    const claimableVat = +(
      isForeignPurchase
        ? 0
        : items
            .filter((i) => i.vat_deductible)
            .reduce((acc, i) => acc + (i.vat_amount || 0), 0)
    ).toFixed(2);
    const totalNet = +(totalGross - claimableVat).toFixed(2);
    const totalVat = +(items.reduce((acc, i) => acc + (i.vat_amount || 0), 0)).toFixed(2);
    return { totalGross, totalNet, totalVat, claimableVat };
  };

  // Non-Irish purchase detection & Claimed VAT
  const isForeignPurchase = isNonIrishPurchase(invoice);
  const isCreditNote = Boolean(
    (invoice?.total_gross !== undefined && invoice.total_gross < 0) ||
    (invoice?.total_net !== undefined && invoice.total_net < 0) ||
    (invoice?.invoice_number && /^(cr|cn|crn)/i.test(invoice.invoice_number.trim())) ||
    (invoice?.invoice_number && /credit[-_\s]?note/i.test(invoice.invoice_number)) ||
    (invoice as any)?.document_type === 'credit_note' ||
    (invoice as any)?.is_credit_note
  );
  const claimableVat = isForeignPurchase
    ? 0
    : invoice.line_items
        .filter((item) => item.vat_deductible)
        .reduce((acc, item) => acc + (item.vat_amount || 0), 0);

  const handleSetAllForeignUnclaimable = () => {
    const updated = invoice.line_items.map((item) => {
      const gross = item.gross_amount ?? +((item.net_amount || 0) + (item.vat_amount || 0)).toFixed(2);
      return {
        ...item,
        vat_code: 'TN',
        vat_rate: 0.0,
        vat_deductible: false,
        vat_amount: 0.0,
        net_amount: gross,
        gross_amount: gross,
        tax_treatment_notes: 'Non-Irish purchase: Foreign VAT unclaimable on Irish VAT3 (TN).',
      };
    });

    const totals = computeInvoiceTotals(updated, invoice.total_gross);

    setInvoice({
      ...invoice,
      line_items: updated,
      total_net: totals.totalNet,
      total_vat: totals.totalVat,
      total_gross: totals.totalGross,
    });

    onShowToast('All line items coded as TN (Foreign VAT unclaimable on VAT3)');
  };

  // 1-Click Staff Entertainment (Section 60(2)(b) VATCA 2010 Exception)
  const handleApplyStaffEntertainment = () => {
    const updatedLineItems: LineItem[] = invoice.line_items.map((item) => {
      const isEnt =
        item.xero_account_code === '413' ||
        (item.xero_account_code === '429' && !item.vat_deductible) ||
        item.entertainment_context === 'client_entertainment' ||
        item.entertainment_context === 'mixed_or_unclear';

      if (isEnt) {
        const gross = item.gross_amount ?? +((item.net_amount || 0) + (item.vat_amount || 0)).toFixed(2);

        if (isForeignPurchase) {
          // Under Section 59/60, non-domestic VAT can NEVER be claimed on Irish VAT3
          return {
            ...item,
            xero_account_code: '413',
            xero_expense_category: 'Expenses',
            entertainment_context: 'staff_entertainment',
            vat_deductible: false,
            income_tax_deductible: false,
            vat_code: 'TN',
            vat_rate: 0.0,
            vat_amount: 0.0,
            net_amount: gross,
            gross_amount: gross,
            tax_treatment_notes:
              'Non-domestic purchase: Foreign VAT cannot be claimed on Irish VAT3 (TN). Reclassified to 413 Staff Entertainment.',
          };
        }

        const statutoryRate = item.vat_rate > 0 ? item.vat_rate : 13.5;
        const vatCode =
          statutoryRate === 0
            ? 'T0'
            : Math.abs(statutoryRate - 13.5) < 0.2
            ? 'T135'
            : 'T23';
        const netAmount = +(gross / (1 + statutoryRate / 100)).toFixed(2);
        const vatAmount = +(gross - netAmount).toFixed(2);

        return {
          ...item,
          xero_account_code: '413',
          xero_expense_category: 'Expenses',
          entertainment_context: 'staff_entertainment',
          vat_deductible: true,
          income_tax_deductible: false, // Section 840 TCA 1997 disallows CT deduction
          vat_code: vatCode,
          vat_rate: statutoryRate,
          net_amount: netAmount,
          vat_amount: vatAmount,
          gross_amount: gross,
          tax_treatment_notes:
            'Section 60(2)(b) staff entertainment: Input VAT claimable, CT non-deductible (Sec 840).',
        };
      }
      return item;
    });

    const totals = computeInvoiceTotals(updatedLineItems, invoice.total_gross);

    setInvoice({
      ...invoice,
      line_items: updatedLineItems,
      total_net: totals.totalNet,
      total_vat: totals.totalVat,
      total_gross: totals.totalGross,
    });
    setAppliedEntertainmentType('staff_entertainment');
    if (isForeignPurchase) {
      onShowToast('Reclassified as Staff Entertainment (413). Foreign VAT remains unclaimable on Irish VAT3 (TN).');
    } else {
      onShowToast('Reclassified as Staff Entertainment. Input VAT claimed under Section 60(2)(b)!');
    }
  };

  // 1-Click Stock for Resale (Section 60(2)(a) VATCA 2010 Exception)
  const handleApplyResaleException = () => {
    const updatedLineItems: LineItem[] = invoice.line_items.map((item) => {
      const isEnt =
        item.xero_account_code === '413' ||
        (item.xero_account_code === '429' && !item.vat_deductible) ||
        item.entertainment_context === 'client_entertainment' ||
        item.entertainment_context === 'mixed_or_unclear';

      if (isEnt) {
        const gross = item.gross_amount ?? +((item.net_amount || 0) + (item.vat_amount || 0)).toFixed(2);

        if (isForeignPurchase) {
          // Non-domestic resale: CT deductible as Cost of Goods, but foreign VAT cannot be claimed on Irish VAT3
          return {
            ...item,
            xero_account_code: '300',
            xero_expense_category: 'Direct Costs',
            entertainment_context: 'not_applicable',
            vat_deductible: false,
            income_tax_deductible: true,
            vat_code: 'TN',
            vat_rate: 0.0,
            vat_amount: 0.0,
            net_amount: gross,
            gross_amount: gross,
            tax_treatment_notes:
              'Non-domestic purchase: Foreign VAT cannot be claimed on Irish VAT3 (TN). Reclassified to 300 Purchases for resale.',
          };
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

        return {
          ...item,
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
        };
      }
      return item;
    });

    const totals = computeInvoiceTotals(updatedLineItems, invoice.total_gross);

    setInvoice({
      ...invoice,
      line_items: updatedLineItems,
      total_net: totals.totalNet,
      total_vat: totals.totalVat,
      total_gross: totals.totalGross,
    });
    setAppliedEntertainmentType('resale');
    if (isForeignPurchase) {
      onShowToast('Reclassified as Stock for Resale (300). Foreign VAT remains unclaimable on Irish VAT3 (TN).');
    } else {
      onShowToast('Reclassified as Stock for Resale (Xero 300). Input VAT claimed!');
    }
  };

  // Revert back to Section 60(1) Blocked Client Entertainment
  const handleRevertToBlocked = () => {
    const updatedLineItems: LineItem[] = invoice.line_items.map((item) => {
      if (
        item.entertainment_context === 'staff_entertainment' ||
        (item.tax_treatment_notes && item.tax_treatment_notes.includes('Section 60(2)')) ||
        (item.tax_treatment_notes && item.tax_treatment_notes.includes('Reclassified to 300')) ||
        (item.tax_treatment_notes && item.tax_treatment_notes.includes('Reclassified to 413'))
      ) {
        const gross = item.gross_amount ?? +((item.net_amount || 0) + (item.vat_amount || 0)).toFixed(2);
        return {
          ...item,
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
        };
      }
      return item;
    });

    const totals = computeInvoiceTotals(updatedLineItems, invoice.total_gross);

    setInvoice({
      ...invoice,
      line_items: updatedLineItems,
      total_net: totals.totalNet,
      total_vat: totals.totalVat,
      total_gross: totals.totalGross,
    });
    setAppliedEntertainmentType(null);
    onShowToast('Reverted to non-deductible client entertainment (Input VAT blocked).');
  };

  // Auto-Reconcile Line VAT to Invoice Total
  const handleAutoReconcileVat = () => {
    if (!invoice || !invoice.line_items) return;

    let updated = [...invoice.line_items];
    const totalVat = invoice.total_vat;

    // Case 1: If invoice total VAT is 0.00, force all lines to 0% (T0 / TE)
    if (Math.abs(totalVat) < 0.02) {
      updated = updated.map((item) => ({
        ...item,
        vat_rate: 0.0,
        vat_code: item.vat_code === 'TN' || item.vat_code === 'TE' ? item.vat_code : 'T0',
        vat_amount: 0.0,
        gross_amount: item.net_amount,
      }));
    } else {
      // Case 2: Multi-step reconciliation of optional and variable items
      const shippingKeywords = ['shipping', 'delivery', 'freight', 'carriage', 'postage', 'courier', 'transport', 'dostava'];
      const depositKeywords = ['deposit', 're-turn', 'returnable', 'povratna', 'naknada', 'drs', 'kaucija', 'pfand', 'ambalaz', 'ambalaž', '150ml', '500ml', '3liter', '3l', '[redacted]'];
      const packagingKeywords = ['pallet', 'crate', 'packaging'];
      const financialKeywords = ['surcharge', 'card fee', 'merchant fee', 'handling fee', 'processing fee'];
      const insuranceKeywords = ['insurance', 'transit protection'];

      // 1. Deposits are statutory 0% T0, financial/insurance are 0% TE, and net == gross items are 0%
      updated = updated.map((item) => {
        const desc = (item.description || '').toLowerCase();
        if (depositKeywords.some((k) => desc.includes(k)) && (item.vat_rate > 0 || desc.includes('[redacted]'))) {
          let cleanDesc = item.description;
          if (desc.includes('[redacted]')) {
            if (desc.includes('500ml') || desc.includes('150ml')) {
              cleanDesc = 'Re-turn Deposits 150ml - 500ml';
            } else if (desc.includes('3l') || desc.includes('3liter')) {
              cleanDesc = 'Re-turn Deposits >500ml - 3liter';
            } else {
              cleanDesc = 'Re-turn Container Deposits';
            }
          }
          return {
            ...item,
            description: cleanDesc,
            vat_rate: 0.0,
            vat_code: 'T0',
            vat_amount: 0.0,
            gross_amount: item.net_amount,
            xero_account_code: item.xero_account_code === '429' ? '300' : item.xero_account_code,
          };
        }
        if (financialKeywords.some((k) => desc.includes(k)) && item.vat_rate > 0) {
          return {
            ...item,
            vat_rate: 0.0,
            vat_code: 'TE',
            vat_amount: 0.0,
            gross_amount: item.net_amount,
            xero_account_code: item.xero_account_code === '429' ? '404' : item.xero_account_code,
          };
        }
        if (insuranceKeywords.some((k) => desc.includes(k)) && item.vat_rate > 0) {
          return {
            ...item,
            vat_rate: 0.0,
            vat_code: 'TE',
            vat_amount: 0.0,
            gross_amount: item.net_amount,
            xero_account_code: item.xero_account_code === '429' ? '415' : item.xero_account_code,
          };
        }
        if (Math.abs((item.gross_amount || 0) - item.net_amount) < 0.02 && item.vat_rate > 0) {
          return {
            ...item,
            vat_rate: 0.0,
            vat_code: item.vat_code === 'TN' || item.vat_code === 'TE' ? item.vat_code : 'T0',
            vat_amount: 0.0,
          };
        }
        return item;
      });

      // 2. If line VAT still exceeds total VAT, check shipping & packaging lines
      const newVatSum = updated.reduce((acc, i) => acc + (i.vat_amount || 0), 0);
      if (newVatSum > totalVat + 0.02) {
        let remainingDiscrepancy = newVatSum - totalVat;
        updated = updated.map((item) => {
          const desc = (item.description || '').toLowerCase();
          const isShippingOrPackaging = shippingKeywords.some((k) => desc.includes(k)) || packagingKeywords.some((k) => desc.includes(k));
          if (isShippingOrPackaging && item.vat_amount > 0 && remainingDiscrepancy > 0.02) {
            if (Math.abs(item.vat_amount - remainingDiscrepancy) <= 0.05 || item.vat_amount <= remainingDiscrepancy + 0.05) {
              remainingDiscrepancy -= item.vat_amount;
              return {
                ...item,
                vat_rate: 0.0,
                vat_code: 'T0',
                vat_amount: 0.0,
                gross_amount: item.net_amount,
                xero_account_code: item.xero_account_code === '429' ? '414' : item.xero_account_code,
              };
            }
          }
          return item;
        });
      }
    }

    // Recalculate totals
    const totals = computeInvoiceTotals(updated, invoice.total_gross);

    setInvoice({
      ...invoice,
      line_items: updated,
      total_net: totals.totalNet,
      total_vat: totals.totalVat,
      total_gross: totals.totalGross,
    });

    onShowToast('Line VAT reconciled with document total');
  };

  // Modify individual line item
  const handleChangeLineItem = (index: number, updated: Partial<LineItem>) => {
    const newItems = [...invoice.line_items];
    const prevItem = newItems[index];
    const merged = { ...prevItem, ...updated };

    // If net_amount or vat_amount was directly updated, keep gross_amount in sync
    if (updated.net_amount !== undefined || updated.vat_amount !== undefined) {
      merged.gross_amount = +(
        (merged.net_amount || 0) + (merged.vat_amount || 0)
      ).toFixed(2);
    }

    newItems[index] = merged;

    const totals = computeInvoiceTotals(newItems, invoice.total_gross);

    setInvoice({
      ...invoice,
      line_items: newItems,
      total_net: totals.totalNet,
      total_vat: totals.totalVat,
      total_gross: totals.totalGross,
    });
  };

  // Add Line Item
  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: 'custom-' + Math.random().toString(36).substring(2, 9),
      description: 'New Extracted Line Item',
      quantity: 1,
      unit_price: 100.0,
      net_amount: 100.0,
      vat_rate: 23.0,
      vat_code: 'T23',
      xero_account_code: '300',
      vat_deductible: true,
      income_tax_deductible: true,
      vat_amount: 23.0,
      gross_amount: 123.0,
      confidence: 1.0,
      reasoning: 'Manually added line item',
    };
    const newItems = [...invoice.line_items, newItem];
    const totals = computeInvoiceTotals(newItems);

    setInvoice({
      ...invoice,
      line_items: newItems,
      total_net: totals.totalNet,
      total_vat: totals.totalVat,
      total_gross: totals.totalGross,
    });
    setSelectedLineIndex(newItems.length - 1);
  };

  // Remove Line Item
  const handleRemoveLineItem = (index: number) => {
    const newItems = invoice.line_items.filter((_, i) => i !== index);
    const totals = computeInvoiceTotals(newItems);

    setInvoice({
      ...invoice,
      line_items: newItems,
      total_net: totals.totalNet,
      total_vat: totals.totalVat,
      total_gross: totals.totalGross,
    });
    if (selectedLineIndex >= newItems.length) {
      setSelectedLineIndex(Math.max(0, newItems.length - 1));
    }
  };

  // Update invoice header details
  const handleUpdateInvoiceField = (field: keyof InvoiceDetail, value: any) => {
    if (isLocked) return;
    setInvoice((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Save Review Draft (PATCH)
  const handleSaveCorrections = async () => {
    setIsSaving(true);
    try {
      await apiService.submitReviewCorrections(invoice.id, {
        ...invoice,
        is_draft: true,
      });
      onShowToast('Invoice corrections saved as draft');
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to save corrections');
    } finally {
      setIsSaving(false);
    }
  };

  // Unlock Invoice for Editing (reverts requires_human_review to true)
  const handleUnlockInvoice = async () => {
    if (!invoice) return;
    setIsSaving(true);
    try {
      await apiService.unlockInvoice(invoice.id);
      setWorkflowStep(2);
      setInvoice({
        ...invoice,
        requires_human_review: true,
        is_approved: false,
        status: 'needs_review',
      });
      onShowToast(`Invoice ${invoice.invoice_number} unlocked for editing`);
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to unlock invoice');
    } finally {
      setIsSaving(false);
    }
  };

  // Approve (current invoice) with all current edits & line items
  const handleApproveInvoice = async () => {
    if (!invoice) return;
    setIsSaving(true);
    try {
      await apiService.submitReviewCorrections(invoice.id, {
        ...invoice,
        is_draft: false,
      });
      setWorkflowStep(3);
      setInvoice({
        ...invoice,
        requires_human_review: false,
        is_approved: true,
        status: 'approved',
      });
      onShowToast(`Invoice ${invoice.invoice_number} approved — ready to post to Xero`);
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to approve invoice');
    } finally {
      setIsSaving(false);
    }
  };

  // Approve & Next with all current edits & line items
  const handleApproveAndNext = async () => {
    if (!invoice) return;
    setIsSaving(true);
    try {
      await apiService.submitReviewCorrections(invoice.id, {
        ...invoice,
        is_draft: false,
      });
      setWorkflowStep(3);
      setInvoice({
        ...invoice,
        requires_human_review: false,
        is_approved: true,
        status: 'approved',
      });
      if (nextId) {
        onShowToast(`Invoice ${invoice.invoice_number} approved — advancing to next`);
        navigateTo(nextId);
      } else {
        onShowToast(`Invoice ${invoice.invoice_number} approved (reached last invoice)`);
      }
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to approve invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    setIsDeleting(true);
    try {
      await apiService.deleteInvoice(invoice.id, invoice.job_id);
      onShowToast(`Invoice ${invoice.invoice_number} deleted`);
      setIsDeleteOpen(false);
      const updatedIds = cycleInvoiceIds.filter((id) => id !== invoice.id);
      setCycleInvoiceIds(updatedIds);
      if (hasNext && nextId) {
        navigateTo(nextId);
      } else if (hasPrevious && previousId) {
        navigateTo(previousId);
      } else {
        onBack();
      }
    } catch (err) {
      console.error(err);
      onShowToast('Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  const isPeriodLocked = Boolean(invoice?.is_period_locked);
  const periodLockedYearName = invoice?.locked_year_name;
  const isLocked = workflowStep === 3 || isPeriodLocked;
  const selectedItem = invoice?.line_items?.[selectedLineIndex] || null;


  return (
    <div className="flex-1 flex flex-col min-w-0 w-full max-w-full h-full max-h-full overflow-hidden bg-background">
      {/* Consolidated Compact Action Header (Only ~44px, Stepper & Banner Merged) */}
      <div className="h-11 shrink-0 px-3 sm:px-4 border-b border-border bg-card/95 backdrop-blur-xs flex items-center justify-between gap-2 z-20 select-none shadow-2xs">
        {/* Left: Back button, prev/next, invoice number & badges */}
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-7.5 px-2.5 gap-1.5 text-xs font-semibold shrink-0"
            title="Back to Purchases list"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Purchases</span>
          </Button>

          {/* Next & Previous Navigation Bar */}
          {totalInvoices > 1 && (
            <div className="flex items-center gap-0.5 bg-muted/60 border border-border/60 rounded-md p-0.5 shrink-0">
              <button
                type="button"
                disabled={!hasPrevious || isSaving}
                onClick={handlePreviousInvoice}
                className="size-6 inline-flex items-center justify-center rounded hover:bg-card disabled:opacity-40 text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-not-allowed"
                title="Previous Invoice ([)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-[11px] font-mono font-bold text-muted-foreground select-none">
                {currentIndex >= 0 ? `${currentIndex + 1}/${totalInvoices}` : '—'}
              </span>
              <button
                type="button"
                disabled={!hasNext || isSaving}
                onClick={handleNextInvoice}
                className="size-6 inline-flex items-center justify-center rounded hover:bg-card disabled:opacity-40 text-muted-foreground hover:text-foreground cursor-pointer disabled:cursor-not-allowed"
                title="Next Invoice (])"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="h-4 w-px bg-border shrink-0" />

          {/* Invoice # Title */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-extrabold text-foreground font-mono truncate">
              {invoice.invoice_number || 'INV-DRAFT'}
            </h1>
            {isCreditNote && (
              <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 font-bold uppercase tracking-wider py-0 px-1.5 shrink-0">
                Credit Note
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Line Inspector, More Actions (•••), Save Draft, Approve Invoice CTAs */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Line Inspector Toggle */}
          <Button
            variant={isInspectorOpen ? "secondary" : "outline"}
            size="sm"
            onClick={toggleInspector}
            className="h-7.5 px-2 text-xs gap-1 shrink-0 font-medium"
            title={isInspectorOpen ? "Close Line Inspector panel" : "Open Line Inspector panel (Section 60 VAT & GL Codes)"}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="hidden xl:inline">{isInspectorOpen ? 'Hide Inspector' : 'Inspector'}</span>
          </Button>

          {/* More Actions Dropdown (•••) for Re-run OCR & Delete */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="h-7.5 w-7.5 p-0 shrink-0 text-muted-foreground hover:text-foreground"
              title="More Actions (Re-run OCR, Delete invoice)"
              aria-label="More Actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>

            {isMoreMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-44 rounded-lg bg-card border border-border shadow-lg p-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs"
                onClick={() => setIsMoreMenuOpen(false)}
              >
                <button
                  type="button"
                  disabled={isReocring || isPeriodLocked}
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    handleReocr();
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 flex items-center gap-2 font-medium cursor-pointer disabled:opacity-50"
                  title="Re-run multimodal vision OCR extraction"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isReocring && "animate-spin")} />
                  <span>{isReocring ? 'Re-extracting...' : 'Re-run OCR'}</span>
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    handleAutoReconcileVat();
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-foreground hover:bg-muted flex items-center gap-2 font-medium cursor-pointer disabled:opacity-50"
                  title="Auto-reconcile line item VAT to invoice total"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Auto-Reconcile VAT</span>
                </button>

                <div className="my-1 border-t border-border" />

                <button
                  type="button"
                  disabled={isDeleting || isPeriodLocked}
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsDeleteOpen(true);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-destructive hover:bg-destructive/10 flex items-center gap-2 font-medium cursor-pointer disabled:opacity-50"
                  title="Delete invoice"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Invoice</span>
                </button>
              </div>
            )}
          </div>

          {/* Save Draft */}
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving || isLocked}
            onClick={handleSaveCorrections}
            className="h-7.5 px-2.5 text-xs gap-1 font-medium shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save Draft</span>
          </Button>

          {/* Primary Approve Action */}
          {!isLocked ? (
            hasNext ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={handleApproveInvoice}
                  className="h-7.5 px-2.5 text-xs gap-1 font-semibold text-foreground shrink-0"
                  title="Approve invoice and stay on this screen"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden md:inline">Approve</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  onClick={handleApproveAndNext}
                  className="h-7.5 px-3 text-xs gap-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0"
                  title="Approve invoice and advance to next invoice"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve & Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={isSaving}
                onClick={handleApproveInvoice}
                className="h-7.5 px-3 text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve Invoice</span>
              </Button>
            )
          ) : isLocked && !isPeriodLocked ? (
            <Button
              size="sm"
              onClick={handleUnlockInvoice}
              disabled={isSaving}
              className="h-7.5 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shrink-0"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock for Editing</span>
            </Button>
          ) : (
            <span
              className="h-7.5 px-2.5 text-xs rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold inline-flex items-center gap-1 select-none"
              title={periodLockedYearName ? `Financial period (${periodLockedYearName}) is closed` : 'Financial period is closed'}
            >
              <Lock className="w-3.5 h-3.5 text-purple-600" /> Period Closed
            </span>
          )}
        </div>
      </div>

      {/* Main Review Grid Area (Locked to Viewport Height, Independent Scrolling Panes) */}
      <div className="flex-1 min-h-0 p-3 overflow-hidden flex flex-col">
        {/* Mobile View Toggle (visible on < lg viewports) */}
        <div className="flex lg:hidden items-center p-1 bg-muted/60 rounded-xl border border-border mb-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileViewTab('lines')}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              mobileViewTab === 'lines'
                ? "bg-card text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="w-3.5 h-3.5" /> Line Items ({invoice.line_items.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileViewTab('canvas')}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              mobileViewTab === 'canvas'
                ? "bg-card text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="w-3.5 h-3.5" /> Document Canvas
          </button>
          <button
            type="button"
            onClick={() => setMobileViewTab('inspector')}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              mobileViewTab === 'inspector'
                ? "bg-card text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Inspector
          </button>
        </div>

        {/* 2-Pane Split Workspace (Default 40% Document / 60% Extracted Data, Expanded 50% / 50%) */}
        <div
          className={cn(
            "grid grid-cols-1 gap-3 flex-1 min-h-0 overflow-hidden transition-all duration-200",
            isCanvasExpanded
              ? "lg:grid-cols-[50fr_50fr] 2xl:grid-cols-[50fr_50fr]"
              : "lg:grid-cols-[40fr_60fr] 2xl:grid-cols-[38fr_42fr_20fr]"
          )}
        >
          {/* Left Column: Original Invoice Document Canvas */}
          <div
            className={cn(
              "h-full min-h-0 flex flex-col overflow-hidden",
              mobileViewTab !== 'canvas' && "hidden lg:flex"
            )}
          >
            <InvoiceCanvas
              invoice={invoice}
              selectedLineItemId={selectedItem?.id}
              isExpanded={isCanvasExpanded}
              onToggleExpand={() => setIsCanvasExpanded((prev) => !prev)}
              onDownload={() => onShowToast('Downloaded original invoice document')}
              onDocumentChange={(file) => {
                const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
                const docUrl = URL.createObjectURL(file);
                setInvoice({
                  ...invoice,
                  document_url: docUrl,
                  document_type: isPdf ? 'pdf' : 'image',
                  page_image_url: isPdf ? undefined : docUrl,
                });
                onShowToast(`Loaded document: ${file.name}`);
              }}
            />
          </div>

          {/* Right Column: Line Items & Sticky Reconciliation */}
          <div
            onClick={() => {
              if (isCanvasExpanded) {
                setIsCanvasExpanded(false);
              }
            }}
            className={cn(
              "h-full min-h-0 flex flex-col overflow-hidden gap-2 transition-all",
              isCanvasExpanded && "cursor-pointer",
              mobileViewTab !== 'lines' && "hidden lg:flex"
            )}
          >
            {/* Non-Irish Purchase / Foreign VAT Notice (if applicable) */}
            {isForeignPurchase && (
              <div className="shrink-0">
                <NonIrishPurchaseBanner
                  sellerName={invoice.seller_name}
                  sellerVat={invoice.seller_vat}
                  currency={invoice.currency}
                  claimedVat={claimableVat}
                  documentVat={invoice.total_vat}
                  onSetAllForeignUnclaimable={handleSetAllForeignUnclaimable}
                  isAllUnclaimable={claimableVat === 0}
                />
              </div>
            )}

            {/* Section 60 Irish Compliance Banner (if warning) */}
            {hasSection60Warning && (
              <div className="shrink-0">
                <Section60Banner
                  hasSection60Warning={hasSection60Warning}
                  itemCount={section60Lines.length}
                  onApplyStaffEntertainment={handleApplyStaffEntertainment}
                  onApplyResaleException={handleApplyResaleException}
                  onRevertToBlocked={handleRevertToBlocked}
                  appliedType={appliedEntertainmentType}
                  isForeignPurchase={isForeignPurchase}
                />
              </div>
            )}

            {/* Cash Payment Settlement Banner */}
            {invoice.is_cash_paid && (
              <div className="shrink-0 flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <strong>Paid in Cash:</strong> Excluded from open bank reconciliation.
                    {invoice.payment_details && (
                      <span className="font-mono text-muted-foreground ml-1">({invoice.payment_details})</span>
                    )}
                  </div>
                </div>
                {invoice.amount_paid !== null && invoice.amount_paid !== undefined && (
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap ml-2">
                    {invoice.currency || '€'}{Number(invoice.amount_paid).toFixed(2)}
                  </span>
                )}
              </div>
            )}

            {/* Invoice Header Details Box - Just Above Extracted Line Items */}
            <div className="shrink-0 rounded-xl border border-border bg-card shadow-2xs p-2.5 sm:p-3 space-y-2 select-none">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Invoice Details</span>
                  </div>
                  {isCreditNote && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 font-bold uppercase tracking-wider">
                      Credit Note
                    </span>
                  )}
                  {invoice.is_cash_paid && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold inline-flex items-center gap-1">
                      <Banknote className="w-3 h-3 text-amber-600" /> Cash Settled
                    </span>
                  )}
                  {workflowStep === 3 ? (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold inline-flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Approved
                    </span>
                  ) : invoice.requires_human_review ? (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold inline-flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" /> Needs Review
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-muted text-muted-foreground font-semibold">
                      Verified
                    </span>
                  )}
                  {((invoice.pages && invoice.pages.length > 1) || (invoice.extracted_data?.page_numbers?.length || 0) > 1) && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-bold font-mono inline-flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5" />
                      {invoice.pages?.length || invoice.extracted_data?.page_numbers?.length || 2}p
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {invoice.ocr_confidence && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border">
                      {Math.round(invoice.ocr_confidence * 100)}% Confidence
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata Fields Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2 text-[11px]">
                {/* 1. Supplier / Vendor */}
                <div className="p-2 rounded-lg bg-muted/20 border border-border/60 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider truncate">
                    Supplier / Vendor
                  </span>
                  {!isLocked ? (
                    <input
                      type="text"
                      value={invoice.seller_name || ''}
                      onChange={(e) => handleUpdateInvoiceField('seller_name', e.target.value)}
                      placeholder="Supplier Name"
                      className="w-full font-bold text-foreground text-[11px] bg-transparent hover:bg-input/20 focus:bg-background focus:ring-1 focus:ring-ring rounded px-1 -mx-1 outline-none truncate mt-0.5"
                    />
                  ) : (
                    <div className="font-bold text-foreground truncate mt-0.5" title={invoice.seller_name}>
                      {formatSupplierName(invoice.seller_name) || '—'}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                    {invoice.seller_vat ? `VAT: ${invoice.seller_vat}` : 'No VAT registered'}
                  </div>
                </div>

                {/* 2. Invoice / Ref Number */}
                <div className="p-2 rounded-lg bg-muted/20 border border-border/60 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider truncate">
                    Invoice #
                  </span>
                  {!isLocked ? (
                    <input
                      type="text"
                      value={invoice.invoice_number || ''}
                      onChange={(e) => handleUpdateInvoiceField('invoice_number', e.target.value)}
                      placeholder="Invoice Number"
                      className="w-full font-mono font-bold text-foreground text-[11px] bg-transparent hover:bg-input/20 focus:bg-background focus:ring-1 focus:ring-ring rounded px-1 -mx-1 outline-none truncate mt-0.5"
                    />
                  ) : (
                    <div className="font-mono font-bold text-foreground truncate mt-0.5">
                      {invoice.invoice_number || '—'}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                    Currency: {invoice.currency || 'EUR'}
                  </div>
                </div>

                {/* 3. Invoice Date */}
                <div className="p-2 rounded-lg bg-muted/20 border border-border/60 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider truncate">
                    Invoice Date
                  </span>
                  {!isLocked ? (
                    <input
                      type="date"
                      value={invoice.invoice_date ? invoice.invoice_date.slice(0, 10) : ''}
                      onChange={(e) => handleUpdateInvoiceField('invoice_date', e.target.value)}
                      className="w-full font-mono font-semibold text-foreground text-[11px] bg-transparent hover:bg-input/20 focus:bg-background focus:ring-1 focus:ring-ring rounded px-1 -mx-1 outline-none mt-0.5"
                    />
                  ) : (
                    <div className="font-mono font-semibold text-foreground truncate mt-0.5">
                      {invoice.invoice_date ? formatAppDate(invoice.invoice_date) : '—'}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                    {invoice.due_date ? `Due: ${formatAppDate(invoice.due_date)}` : 'Due: On Receipt'}
                  </div>
                </div>

                {/* 4. Payment Terms & Method */}
                <div className="p-2 rounded-lg bg-muted/20 border border-border/60 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider truncate">
                    Payment Terms
                  </span>
                  {!isLocked ? (
                    <input
                      type="date"
                      value={invoice.due_date ? invoice.due_date.slice(0, 10) : ''}
                      onChange={(e) => handleUpdateInvoiceField('due_date', e.target.value)}
                      className="w-full font-mono text-foreground text-[11px] bg-transparent hover:bg-input/20 focus:bg-background focus:ring-1 focus:ring-ring rounded px-1 -mx-1 outline-none mt-0.5"
                    />
                  ) : (
                    <div className="font-mono text-foreground truncate mt-0.5">
                      {invoice.due_date ? formatAppDate(invoice.due_date) : 'On Receipt'}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                    {invoice.is_cash_paid ? 'Paid in Cash' : invoice.payment_method || 'Open Balance'}
                  </div>
                </div>
              </div>

              {/* Financial Totals Row */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
                <div className="px-2.5 py-1.5 rounded-md bg-muted/30 border border-border/50 flex items-center justify-between min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate mr-1">
                    Net
                  </span>
                  {!isLocked ? (
                    <div className={cn(
                      "flex items-center gap-0.5 font-mono font-semibold text-[11px] shrink-0",
                      isCreditNote ? "text-red-700 dark:text-red-400" : "text-foreground"
                    )}>
                      <span>{isCreditNote ? '-' : ''}{invoice.currency || '€'}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={invoice.total_net != null ? (isCreditNote ? Math.abs(invoice.total_net) : invoice.total_net) : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleUpdateInvoiceField('total_net', isCreditNote ? -Math.abs(val) : val);
                        }}
                        className={cn(
                          "w-16 sm:w-20 text-right bg-transparent hover:bg-input/20 focus:bg-background focus:ring-1 focus:ring-ring rounded px-1 outline-none font-mono text-[11px]",
                          isCreditNote ? "text-red-700 dark:text-red-400" : "text-foreground"
                        )}
                      />
                    </div>
                  ) : (
                    <span className={cn(
                      "font-mono font-semibold text-[11px] shrink-0",
                      isCreditNote ? "text-red-700 dark:text-red-400" : "text-foreground"
                    )}>
                      {formatCurrency(isCreditNote ? -Math.abs(Number(invoice.total_net) || 0) : invoice.total_net, invoice.currency)}
                    </span>
                  )}
                </div>

                <div className="px-2.5 py-1.5 rounded-md bg-muted/30 border border-border/50 flex items-center justify-between min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate mr-1">
                    VAT
                  </span>
                  {!isLocked ? (
                    <div className={cn(
                      "flex items-center gap-0.5 font-mono font-semibold text-[11px] shrink-0",
                      isCreditNote ? "text-red-700 dark:text-red-400" : "text-foreground"
                    )}>
                      <span>{isCreditNote ? '-' : ''}{invoice.currency || '€'}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={invoice.total_vat != null ? (isCreditNote ? Math.abs(invoice.total_vat) : invoice.total_vat) : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleUpdateInvoiceField('total_vat', isCreditNote ? -Math.abs(val) : val);
                        }}
                        className={cn(
                          "w-16 sm:w-20 text-right bg-transparent hover:bg-input/20 focus:bg-background focus:ring-1 focus:ring-ring rounded px-1 outline-none font-mono text-[11px]",
                          isCreditNote ? "text-red-700 dark:text-red-400" : "text-foreground"
                        )}
                      />
                    </div>
                  ) : (
                    <span className={cn(
                      "font-mono font-semibold text-[11px] shrink-0",
                      isCreditNote ? "text-red-700 dark:text-red-400" : "text-foreground"
                    )}>
                      {formatCurrency(isCreditNote ? -Math.abs(Number(invoice.total_vat) || 0) : invoice.total_vat, invoice.currency)}
                    </span>
                  )}
                </div>

                <div className="px-2.5 py-1.5 rounded-md bg-muted/30 border border-border/50 flex items-center justify-between min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate mr-1">
                    Total Gross
                  </span>
                  {!isLocked ? (
                    <div className={cn(
                      "flex items-center gap-0.5 font-mono font-bold text-[11px] shrink-0",
                      isCreditNote ? "text-red-700 dark:text-red-400" : "text-foreground"
                    )}>
                      <span>{isCreditNote ? '-' : ''}{invoice.currency || '€'}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={invoice.total_gross != null ? (isCreditNote ? Math.abs(invoice.total_gross) : invoice.total_gross) : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleUpdateInvoiceField('total_gross', isCreditNote ? -Math.abs(val) : val);
                        }}
                        className={cn(
                          "w-16 sm:w-20 text-right bg-transparent hover:bg-input/20 focus:bg-background focus:ring-1 focus:ring-ring rounded px-1 outline-none font-mono text-[11px] font-bold",
                          isCreditNote ? "text-red-700 dark:text-red-400" : "text-foreground"
                        )}
                      />
                    </div>
                  ) : (
                    <span
                      className={cn(
                        "font-mono font-bold text-[11px] shrink-0",
                        isCreditNote ? "text-red-700 dark:text-red-400" : "text-foreground"
                      )}
                    >
                      {formatCurrency(isCreditNote ? -Math.abs(Number(invoice.total_gross) || 0) : invoice.total_gross, invoice.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table with Built-In Sticky Reconciliation Footer */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <LineItemsTable
                lineItems={invoice.line_items}
                selectedIndex={selectedLineIndex}
                onSelectIndex={setSelectedLineIndex}
                onChangeLineItem={handleChangeLineItem}
                onAddLineItem={handleAddLineItem}
                onRemoveLineItem={handleRemoveLineItem}
                isForeignPurchase={isForeignPurchase}
                currency={invoice.currency}
                capitalizationThreshold={
                  apiService.getCachedOrgs().find(
                    (o) => o.id === (activeOrgId || apiService.getActiveOrgId())
                  )?.capitalization_threshold ?? 500
                }
                isLocked={isLocked}
                expectedGross={invoice.total_gross}
                expectedVat={invoice.total_vat}
                expectedNet={invoice.total_net}
                isDocExpanded={isCanvasExpanded}
                onRestoreNormalWidth={() => setIsCanvasExpanded(false)}
                glAccounts={glAccounts}
              />
            </div>
          </div>

          {/* Mobile Tab: Line Item Inspector View (visible on < lg when tab is selected) */}
          <div className={cn("flex flex-col gap-3 min-w-0 lg:hidden", mobileViewTab !== 'inspector' && 'hidden')}>
            <LineItemInspector
              item={selectedItem}
              isOpen={true}
              onToggleOpen={() => setMobileViewTab('lines')}
              onUpdateItem={(updated) => handleChangeLineItem(selectedLineIndex, updated)}
              isForeignPurchase={isForeignPurchase}
              currency={invoice.currency}
              isLocked={isLocked}
              glAccounts={glAccounts}
            />
          </div>

          {/* Right Column: In-flow Line Item Inspector for wide screens (≥ 1536px / 2xl) */}
          <div className={cn("hidden", !isCanvasExpanded && "2xl:block")}>
            <LineItemInspector
              inspectorRef={inspectorRef}
              item={selectedItem}
              isOpen={isInspectorOpen}
              onToggleOpen={toggleInspector}
              onUpdateItem={(updated) => handleChangeLineItem(selectedLineIndex, updated)}
              isForeignPurchase={isForeignPurchase}
              currency={invoice.currency}
              isLocked={isLocked}
              style={inspectorHeight ? { height: `${inspectorHeight}px` } : undefined}
              glAccounts={glAccounts}
            />
          </div>
        </div>

        {/* Floating Right-Side Slide-over Inspector for Laptop screens (1024px to 1535px) */}
        {isInspectorOpen && !isCanvasExpanded && (
          <aside
            aria-label="Line Item Inspector Panel"
            className="hidden lg:flex 2xl:hidden fixed top-12 right-0 bottom-0 z-40 w-88 bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200 flex-col overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Line Item Inspector
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleInspector}
                className="size-7 text-muted-foreground hover:text-foreground"
                title="Close Inspector Panel"
              >
                <X className="size-4" />
              </Button>
            </div>
            <LineItemInspector
              item={selectedItem}
              isOpen={true}
              onToggleOpen={toggleInspector}
              onUpdateItem={(updated) => handleChangeLineItem(selectedLineIndex, updated)}
              isForeignPurchase={isForeignPurchase}
              currency={invoice.currency}
              isLocked={isLocked}
              glAccounts={glAccounts}
            />
          </aside>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => !isDeleting && setIsDeleteOpen(false)}
        title="Delete Invoice"
        subtitle="Confirm document deletion from accounting records"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-foreground text-sm">
                Delete invoice {invoice.invoice_number}?
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This will permanently delete invoice <strong className="text-foreground font-semibold">{invoice.invoice_number}</strong> ({invoice.seller_name}) and its extracted line items from this workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setIsDeleteOpen(false)}
              className="text-sm"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteInvoice}
              className="gap-1.5 text-sm font-bold shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Deleting...' : 'Delete Invoice'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
