import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Unlock,
  Lock,
  Landmark,
  Eye,
  RefreshCw,
  Banknote,
  Inbox,
  FileSpreadsheet,
  FolderKanban,
} from 'lucide-react';

import { InvoiceListItem, PaginatedInvoices, User } from '../../types/api';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatCurrency, formatSupplierName, cn } from '../../lib/utils';
import { DocumentViewerModal } from './DocumentViewerModal';
import { DocumentSubTab } from '../layout/Sidebar';

interface InvoiceListProps {
  activeOrgId: string;
  currentUser: User | null;
  refreshKey?: number;
  onSelectInvoice: (invoiceId: string, allIds?: string[]) => void;
  onOpenUpload: (initialType?: 'invoice' | 'bank_statement') => void;
  onShowToast: (msg: string) => void;
  documentSubTab?: DocumentSubTab;
  onSelectDocumentSubTab?: (subTab: DocumentSubTab) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  activeOrgId,
  currentUser,
  refreshKey,
  onSelectInvoice,
  onOpenUpload,
  onShowToast,
  documentSubTab = 'purchases',
  onSelectDocumentSubTab,
}) => {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('invparse_invoices_page_size');
    return saved ? Number(saved) : 50;
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [invoicesToDelete, setInvoicesToDelete] = useState<InvoiceListItem[] | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [viewingDocument, setViewingDocument] = useState<InvoiceListItem | null>(null);

  useEffect(() => {
    setPage(1);
    setStatusFilter('all');
  }, [documentSubTab]);

  useEffect(() => {
    loadInvoices();
    setSelectedInvoiceIds([]);
  }, [activeOrgId, statusFilter, searchTerm, page, pageSize, currentUser?.role, refreshKey, documentSubTab]);

  // Auto-poll silently every 3.5 seconds while any invoice is in pending/processing state
  useEffect(() => {
    const hasActiveJobs = invoices.some(
      (inv) => inv.job_status === 'processing' || inv.job_status === 'pending'
    );
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      loadInvoices(true);
    }, 3500);

    return () => clearInterval(interval);
  }, [invoices, activeOrgId, statusFilter, searchTerm, page, pageSize, documentSubTab]);

  const loadInvoices = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let filterToUse: string | undefined = statusFilter;
      if (documentSubTab === 'supplier_statements' && statusFilter === 'all') {
        filterToUse = 'statements';
      } else if (documentSubTab === 'other_documents' && statusFilter === 'all') {
        filterToUse = 'other';
      }
      const res: PaginatedInvoices = await apiService.getInvoices(activeOrgId, {
        status_filter: filterToUse,
        search: searchTerm || undefined,
        page,
        page_size: pageSize,
      });
      setInvoices(res.items);
      setTotalCount(res.total);
    } catch (err) {
      console.error(err);
      if (!silent) onShowToast('Failed to load organization invoices');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const displayedInvoices = useMemo(() => {
    if (documentSubTab === 'purchases') {
      return invoices.filter(
        (inv) =>
          inv.processing_path !== 'bank_statement' &&
          inv.processing_path !== 'supplier_statement' &&
          inv.document_type !== 'bank_statement' &&
          inv.document_type !== 'supplier_statement' &&
          inv.document_type !== 'other_document' &&
          inv.error_code !== 'OTHER_DOCUMENT'
      );
    }
    if (documentSubTab === 'supplier_statements') {
      return invoices.filter(
        (inv) =>
          inv.processing_path === 'supplier_statement' ||
          inv.document_type === 'supplier_statement'
      );
    }
    if (documentSubTab === 'other_documents') {
      return invoices.filter(
        (inv) =>
          inv.error_code === 'OTHER_DOCUMENT' ||
          inv.document_type === 'other_document' ||
          inv.document_type === 'other' ||
          inv.job_status === 'failed'
      );
    }
    return invoices;
  }, [invoices, documentSubTab]);

  const getRowId = (inv: InvoiceListItem) => (inv.invoice_id || inv.job_id);

  const isAllSelected = displayedInvoices.length > 0 && displayedInvoices.every((inv) => selectedInvoiceIds.includes(getRowId(inv)));
  const isSomeSelected = selectedInvoiceIds.length > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(displayedInvoices.map(getRowId));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteInvoices = async () => {
    if (!invoicesToDelete || invoicesToDelete.length === 0) return;
    const periodLocked = invoicesToDelete.filter((i) => i.is_period_locked);
    if (periodLocked.length > 0) {
      onShowToast(`${periodLocked.length} period-locked document(s) cannot be deleted`);
    }
    const eligibleToDelete = invoicesToDelete.filter((i) => !i.is_period_locked);
    if (eligibleToDelete.length === 0) {
      setInvoicesToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      const count = eligibleToDelete.length;
      for (const inv of eligibleToDelete) {
        await apiService.deleteInvoice(inv.invoice_id, inv.job_id);
      }
      onShowToast(
        count === 1
          ? `Document ${eligibleToDelete[0].invoice_number || eligibleToDelete[0].original_filename} deleted`
          : `Successfully deleted ${count} documents`
      );
      const deletedIds = new Set(eligibleToDelete.map(getRowId));
      setSelectedInvoiceIds((prev) => prev.filter((id) => !deletedIds.has(id)));
      setInvoicesToDelete(null);

      // If all items on this page were deleted and we're beyond page 1, go to previous page
      if (invoices.length === count && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        await loadInvoices();
      }
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to delete selected documents');
    } finally {
      setIsDeleting(false);
    }
  };

  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  const selectedNeedsApprovalCount = invoices.filter(
    (inv) => selectedInvoiceIds.includes(getRowId(inv)) && inv.requires_human_review && !inv.is_period_locked && inv.invoice_id
  ).length;

  const selectedLockedCount = invoices.filter(
    (inv) => selectedInvoiceIds.includes(getRowId(inv)) && (!inv.requires_human_review || inv.is_approved) && !inv.is_period_locked && inv.invoice_id
  ).length;

  const handleBulkApprove = async () => {
    const toApprove = invoices.filter(
      (inv) => selectedInvoiceIds.includes(getRowId(inv)) && inv.requires_human_review && !inv.is_period_locked && inv.invoice_id
    );
    if (toApprove.length === 0) return;
    setIsApproving(true);
    try {
      for (const inv of toApprove) {
        if (inv.invoice_id) {
          await apiService.approveInvoice(inv.invoice_id);
        }
      }
      onShowToast(
        `Successfully approved ${toApprove.length} ${
          toApprove.length === 1 ? 'invoice' : 'invoices'
        } — posted to Financial Statements`
      );
      setSelectedInvoiceIds([]);
      await loadInvoices();
    } catch (err) {
      console.error(err);
      onShowToast('Failed to approve selected invoices');
    } finally {
      setIsApproving(false);
    }
  };

  const handleBulkUnlock = async () => {
    const toUnlock = invoices.filter(
      (inv) => selectedInvoiceIds.includes(getRowId(inv)) && (!inv.requires_human_review || inv.is_approved) && !inv.is_period_locked && inv.invoice_id
    );
    if (toUnlock.length === 0) return;
    setIsUnlocking(true);
    try {
      const ids = toUnlock.map((i) => i.invoice_id!).filter(Boolean);
      await apiService.bulkUnlockInvoices(activeOrgId, ids);
      onShowToast(
        `Successfully unlocked ${ids.length} ${
          ids.length === 1 ? 'invoice' : 'invoices'
        } for editing`
      );
      setSelectedInvoiceIds([]);
      await loadInvoices();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to unlock selected invoices');
    } finally {
      setIsUnlocking(false);
    }
  };

  const [isBulkReocring, setIsBulkReocring] = useState<boolean>(false);

  const handleBulkReocr = async () => {
    const selectedItems = invoices.filter((inv) => selectedInvoiceIds.includes(getRowId(inv)));
    if (selectedItems.length === 0) return;

    const periodLocked = selectedItems.filter((i) => i.is_period_locked);
    if (periodLocked.length > 0) {
      onShowToast(`${periodLocked.length} period-locked document(s) skipped`);
    }

    const eligible = selectedItems.filter((i) => !i.is_period_locked && i.job_id);
    if (eligible.length === 0) {
      onShowToast('No eligible documents to reprocess');
      return;
    }

    setIsBulkReocring(true);
    try {
      let succeeded = 0;
      let failed = 0;
      for (const inv of eligible) {
        try {
          await apiService.reprocessJob(inv.job_id, 'invoice');
          succeeded++;
        } catch (e) {
          console.error(`Failed to reprocess job ${inv.job_id}:`, e);
          failed++;
        }
      }

      if (failed === 0) {
        onShowToast(
          `Re-running OCR for ${succeeded} ${
            succeeded === 1 ? 'document' : 'documents'
          }...`
        );
      } else {
        onShowToast(
          `Dispatched ${succeeded} documents for OCR (${failed} failed)`
        );
      }

      setSelectedInvoiceIds([]);
      await loadInvoices();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to reprocess selected documents');
    } finally {
      setIsBulkReocring(false);
    }
  };

  const statusTabs = useMemo(() => {
    if (documentSubTab === 'supplier_statements') {
      return [
        { id: 'all', label: 'All Statements' },
        { id: 'completed', label: 'Reconciled' },
        { id: 'needs_review', label: 'Needs Review' },
        { id: 'unprocessed', label: 'Pending Processing' },
      ];
    }
    if (documentSubTab === 'other_documents') {
      return [
        { id: 'all', label: 'All Other Docs' },
        { id: 'unprocessed', label: 'Unprocessed' },
        { id: 'failed', label: 'Failed Ingestion' },
      ];
    }
    return [
      { id: 'all', label: 'All Purchases' },
      { id: 'needs_review', label: 'Needs Review' },
      { id: 'unprocessed', label: 'Unprocessed' },
      { id: 'partial', label: 'Partial Invoices' },
      { id: 'completed', label: 'Approved' },
    ];
  }, [documentSubTab]);

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-5 flex flex-col bg-background min-w-0 w-full max-w-full overflow-x-hidden">
      {/* Top Document Category Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-card rounded-xl border border-border shadow-xs mb-3.5 shrink-0 overflow-x-auto">
        <button
          onClick={() => onSelectDocumentSubTab?.('purchases')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
            documentSubTab === 'purchases'
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Purchases</span>
        </button>

        <button
          onClick={() => onSelectDocumentSubTab?.('bank_statements')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
            documentSubTab === 'bank_statements'
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Bank Statements</span>
        </button>

        <button
          onClick={() => onSelectDocumentSubTab?.('supplier_statements')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
            documentSubTab === 'supplier_statements'
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Supplier Statements</span>
        </button>

        <button
          onClick={() => onSelectDocumentSubTab?.('other_documents')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
            documentSubTab === 'other_documents'
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Other Documents</span>
        </button>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 mb-3.5 min-w-0 w-full shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold tracking-tight text-foreground truncate">
            {documentSubTab === 'supplier_statements'
              ? 'Supplier Statements & Reconciliations'
              : documentSubTab === 'other_documents'
              ? 'Other & Non-Accounting Documents'
              : 'Purchases & Invoices'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">
            {documentSubTab === 'supplier_statements'
              ? 'Periodic vendor account statements and ledger reconciliation against open purchases.'
              : documentSubTab === 'other_documents'
              ? 'Non-accounting files, contracts, correspondence, and miscellaneous attachments.'
              : 'Automated OCR and visual LLM ingestion pipeline for purchase documents.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenUpload('invoice')}
            className="gap-1.5 text-xs shrink-0 whitespace-nowrap h-8 px-3"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>
              {documentSubTab === 'supplier_statements'
                ? 'Upload Statement'
                : documentSubTab === 'other_documents'
                ? 'Upload Document'
                : 'Upload Invoices'}
            </span>
          </Button>
        </div>
      </div>

      {/* Restricted Role Alert Notice */}
      {currentUser?.role === 'restricted' && (
        <div className="mb-3.5 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Uploader Scope Active:</strong> As a restricted user, you are currently viewing only documents uploaded by your account (
            {currentUser.email}).
          </span>
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="bg-card rounded-xl border border-border shadow-xs p-2 sm:p-2.5 mb-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 min-w-0 w-full shrink-0">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg overflow-x-auto max-w-full scrollbar-none min-w-0">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-card text-foreground font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-56 lg:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice #, supplier..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedInvoiceIds.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/25 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-xs font-bold">
              {selectedInvoiceIds.length}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {selectedInvoiceIds.length === 1 ? '1 document selected' : `${selectedInvoiceIds.length} documents selected`}
            </span>
            <button
              onClick={() => setSelectedInvoiceIds([])}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer transition-colors"
            >
              Deselect all
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Rerun OCR Selected Button */}
            <Button
              variant="warning"
              size="sm"
              disabled={isBulkReocring}
              onClick={handleBulkReocr}
              title="Re-run multimodal vision OCR on all selected documents"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBulkReocring ? 'animate-spin' : ''}`} />
              {isBulkReocring
                ? 'Running OCR...'
                : `Rerun OCR Selected (${selectedInvoiceIds.length})`}
            </Button>

            {selectedLockedCount > 0 && currentUser?.role !== 'restricted' && (
              <Button
                variant="outline"
                size="sm"
                disabled={isUnlocking}
                onClick={handleBulkUnlock}
                className="gap-1.5 text-xs font-bold shadow-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                title="Unlock selected approved invoices so their line items and GL codes can be edited"
              >
                <Unlock className="w-3.5 h-3.5" />
                {isUnlocking ? 'Unlocking...' : `Unlock for Editing (${selectedLockedCount})`}
              </Button>
            )}
            {selectedNeedsApprovalCount > 0 && currentUser?.role !== 'restricted' && (
              <Button
                variant="primary"
                size="sm"
                disabled={isApproving}
                onClick={handleBulkApprove}
                className="gap-1.5 text-xs font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isApproving ? 'Approving...' : `Approve Selected (${selectedNeedsApprovalCount})`}
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                const toDelete = invoices.filter((inv) => selectedInvoiceIds.includes(getRowId(inv)));
                setInvoicesToDelete(toDelete);
              }}
              className="gap-1.5 text-xs font-bold shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedInvoiceIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden flex-1 flex flex-col min-w-0 w-full">
        <div className="overflow-auto flex-1 w-full min-w-0 max-h-[calc(100vh-275px)]">
          <table className="w-full text-left text-[11px] border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-muted border-b border-border text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                <th className="sticky top-0 bg-muted z-20 w-9 px-2 py-2 text-center shrink-0 border-b border-border">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={toggleSelectAll}
                    aria-label="Select all invoices on this page"
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary align-middle"
                  />
                </th>
                <th className="sticky top-0 bg-muted z-20 px-2.5 py-2 font-bold min-w-[120px] border-b border-border">Invoice / Doc</th>
                <th className="sticky top-0 bg-muted z-20 px-2 py-2 font-bold whitespace-nowrap border-b border-border">Date</th>
                <th className="sticky top-0 bg-muted z-20 px-2.5 py-2 font-bold min-w-[130px] border-b border-border">Supplier / Seller</th>
                <th className="sticky top-0 bg-muted z-20 px-2.5 py-2 text-right font-bold whitespace-nowrap border-b border-border">Net</th>
                <th className="sticky top-0 bg-muted z-20 px-2.5 py-2 text-right font-bold whitespace-nowrap border-b border-border">VAT</th>
                <th className="sticky top-0 bg-muted z-20 px-2.5 py-2 text-right font-bold whitespace-nowrap border-b border-border">Total Gross</th>
                <th className="sticky top-0 bg-muted z-20 px-2 py-2 text-center font-bold whitespace-nowrap border-b border-border">Status</th>
                <th className="sticky top-0 bg-muted z-20 px-2 py-2 text-center font-bold whitespace-nowrap border-b border-border">Confidence</th>
                <th className="sticky top-0 right-0 bg-muted z-30 px-2 py-2 text-right font-bold shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] min-w-[105px] border-b border-border">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Loading documents...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="font-medium text-foreground text-sm">
                      {documentSubTab === 'supplier_statements'
                        ? 'No supplier statements found'
                        : documentSubTab === 'other_documents'
                        ? 'No other documents found'
                        : 'No purchase invoices found'}
                    </p>
                    <p className="text-[11px] mt-0.5">
                      {documentSubTab === 'supplier_statements'
                        ? 'Upload a vendor statement to reconcile against purchases.'
                        : documentSubTab === 'other_documents'
                        ? 'Non-accounting files and contracts will appear here.'
                        : 'Upload an invoice to begin automated AI processing.'}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedInvoices.map((inv) => {
                  const rowId = getRowId(inv);
                  const isSelected = selectedInvoiceIds.includes(rowId);
                  const gross = Number(inv.total_gross || 0);
                  const vat =
                    inv.total_vat != null
                      ? Number(inv.total_vat)
                      : inv.total_net != null
                      ? Math.round((gross - Number(inv.total_net)) * 100) / 100
                      : 0;
                  const net =
                    inv.total_net != null
                      ? Number(inv.total_net)
                      : Math.round((gross - vat) * 100) / 100;
                  const isCreditNote = Boolean(
                    gross < 0 ||
                    net < 0 ||
                    inv.document_type === 'credit_note' ||
                    (inv.invoice_number && /^(cr|cn|crn)/i.test(inv.invoice_number.trim())) ||
                    (inv.invoice_number && /credit[-_\s]?note/i.test(inv.invoice_number))
                  );

                  return (
                    <tr
                      key={rowId}
                      onClick={() => {
                        if (inv.invoice_id && documentSubTab === 'purchases') {
                          onSelectInvoice(
                            inv.invoice_id,
                            displayedInvoices.map((i) => i.invoice_id).filter(Boolean) as string[]
                          );
                          return;
                        }
                        // Open source document viewer for statements, failed uploads, and non-purchases
                        setViewingDocument(inv);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 dark:bg-primary/15' : 'hover:bg-muted/40'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td
                        className="w-9 px-2 py-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(rowId, e)}
                          aria-label={`Select document ${inv.invoice_number || inv.original_filename}`}
                          className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary align-middle"
                        />
                      </td>

                      {/* Invoice ID / File */}
                      <td className="px-2.5 py-2">
                        <div className="font-mono font-medium text-[11px] text-foreground hover:text-primary flex items-center gap-1.5">
                          <span>{inv.invoice_number || 'N/A'}</span>
                          {inv.is_cash_paid && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-sans font-semibold border border-emerald-500/25 whitespace-nowrap inline-flex items-center gap-0.5"
                              title={inv.payment_details || 'Paid in Cash'}
                            >
                              <Banknote className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /> Cash
                            </span>
                          )}
                          {isCreditNote && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 font-sans font-bold border border-rose-500/30" title="Credit Note">
                              CR
                            </span>
                          )}
                          {(inv.is_partial || inv.job_status === 'partial_review' || inv.error_code === 'PARTIAL_INVOICE') && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-sans font-semibold border border-amber-500/30 whitespace-nowrap inline-flex items-center gap-0.5"
                              title={inv.error_message || 'Partial Invoice'}
                            >
                              <Clock className="w-2.5 h-2.5 text-amber-600" /> Partial
                            </span>
                          )}
                          {inv.page_count && inv.page_count > 1 ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono font-bold border border-primary/20" title={`${inv.page_count} pages merged`}>
                              {inv.page_count}p
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[9px] text-muted-foreground truncate max-w-[170px]" title={inv.original_filename}>
                          {inv.original_filename}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-2 py-2 text-muted-foreground font-mono text-[10px] font-normal whitespace-nowrap">
                        {inv.invoice_date || '—'}
                      </td>

                      {/* Supplier */}
                      <td className="px-2.5 py-2 font-medium text-[11px] text-foreground truncate max-w-[190px]">
                        {inv.invoice_direction === 'receivable' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 mr-1.5">
                            Sales
                          </span>
                        )}
                        {inv.processing_path === 'supplier_statement' || inv.document_type === 'supplier_statement' ? (
                          <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                            {inv.seller_name || 'Supplier Statement'}
                          </span>
                        ) : inv.processing_path === 'bank_statement' || inv.document_type === 'bank_statement' ? (
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {inv.seller_name || 'Bank Statement'}
                          </span>
                        ) : inv.job_status === 'failed' ? (
                          <span className="text-destructive font-medium" title={inv.error_message || 'Processing failed'}>
                            {inv.seller_name || `Failed: ${inv.error_code || 'Error'}`}
                          </span>
                        ) : inv.error_code === 'OTHER_DOCUMENT' || statusFilter === 'other' || inv.document_type === 'other_document' ? (
                          <span className="text-muted-foreground italic">
                            {inv.seller_name && inv.seller_name !== 'Unknown Supplier'
                              ? inv.seller_name
                              : 'Non-accounting document'}
                          </span>
                        ) : (
                          formatSupplierName(inv.seller_name) || '—'
                        )}
                      </td>

                      {/* Net */}
                      <td className={`px-2.5 py-2 text-right font-mono text-[11px] font-medium whitespace-nowrap ${
                        inv.job_status === 'failed' || inv.error_code === 'OTHER_DOCUMENT' || statusFilter === 'other' || (!inv.invoice_id && !inv.total_net)
                          ? 'text-muted-foreground'
                          : isCreditNote
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {inv.job_status === 'failed' || inv.error_code === 'OTHER_DOCUMENT' || statusFilter === 'other' || (!inv.invoice_id && !inv.total_net)
                          ? '—'
                          : formatCurrency(net, inv.currency)}
                      </td>

                      {/* VAT */}
                      <td className={`px-2.5 py-2 text-right font-mono text-[11px] whitespace-nowrap ${
                        inv.job_status === 'failed' || inv.error_code === 'OTHER_DOCUMENT' || statusFilter === 'other' || (!inv.invoice_id && !inv.total_vat)
                          ? 'text-muted-foreground'
                          : isCreditNote
                          ? 'text-rose-600/80 dark:text-rose-400/80 font-normal'
                          : 'text-emerald-600/80 dark:text-emerald-400/80 font-normal'
                      }`}>
                        {inv.job_status === 'failed' || inv.error_code === 'OTHER_DOCUMENT' || statusFilter === 'other' || (!inv.invoice_id && !inv.total_vat)
                          ? '—'
                          : formatCurrency(vat, inv.currency)}
                      </td>

                      {/* Gross */}
                      <td className={`px-2.5 py-2 text-right font-mono text-[11px] font-semibold whitespace-nowrap ${
                        inv.job_status === 'failed' || inv.error_code === 'OTHER_DOCUMENT' || statusFilter === 'other' || (!gross && !inv.invoice_id)
                          ? 'text-muted-foreground'
                          : isCreditNote
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {inv.job_status === 'failed' || inv.error_code === 'OTHER_DOCUMENT' || statusFilter === 'other' || (!gross && !inv.invoice_id)
                          ? '—'
                          : formatCurrency(gross, inv.currency)}
                      </td>

                      {/* Status */}
                      <td className="px-2 py-2 text-center">
                        {inv.processing_path === 'supplier_statement' || inv.document_type === 'supplier_statement' ? (
                          <Badge variant="outline" className="text-[10px] font-medium py-0.5 px-1.5 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 whitespace-nowrap">
                            <FileText className="w-2.5 h-2.5 text-indigo-600 shrink-0 mr-1 inline" /> Supplier Stmt
                          </Badge>
                        ) : inv.processing_path === 'bank_statement' || inv.document_type === 'bank_statement' ? (
                          <Badge variant="outline" className="text-[10px] font-medium py-0.5 px-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 whitespace-nowrap">
                            <Landmark className="w-2.5 h-2.5 text-emerald-600 shrink-0 mr-1 inline" /> Bank Stmt
                          </Badge>
                        ) : inv.error_code === 'OTHER_DOCUMENT' || statusFilter === 'other' || inv.document_type === 'other_document' ? (
                          <Badge variant="outline" className="text-[10px] font-normal py-0.5 px-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 whitespace-nowrap" title={inv.error_message || 'Classified as non-accounting document'}>
                            <AlertCircle className="w-2.5 h-2.5 text-amber-600 shrink-0 mr-1 inline" /> Other Doc
                          </Badge>
                        ) : inv.is_period_locked ? (
                          <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-1.5 gap-1 bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 whitespace-nowrap">
                            <Lock className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                            {inv.locked_year_name || 'Closed FY'}
                          </Badge>
                        ) : inv.job_status === 'failed' ? (
                          <Badge variant="destructive" className="text-[10px] font-normal py-0.5 px-1.5" title={inv.error_message || 'Processing failed'}>
                            <AlertTriangle className="w-2.5 h-2.5" /> Failed
                          </Badge>
                        ) : inv.job_status === 'partial_review' || inv.error_code === 'PARTIAL_INVOICE' || inv.is_partial ? (
                          <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 whitespace-nowrap" title={inv.error_message || 'Partial invoice waiting for missing pages'}>
                            <AlertCircle className="w-2.5 h-2.5 mr-1 inline text-amber-600" /> Partial (Waiting)
                          </Badge>
                        ) : inv.job_status === 'completed' && !inv.requires_human_review ? (
                          <Badge variant="success" className="text-[10px] font-normal py-0.5 px-1.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                          </Badge>
                        ) : inv.requires_human_review ? (
                          <Badge variant="warning" className="text-[10px] font-normal py-0.5 px-1.5">
                            <AlertCircle className="w-2.5 h-2.5" /> Needs Review
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-normal py-0.5 px-1.5 animate-pulse">
                            <Clock className="w-2.5 h-2.5" /> Processing
                          </Badge>
                        )}
                      </td>

                      {/* OCR Confidence */}
                      <td className="px-2 py-2 text-center font-mono font-normal text-[10px] whitespace-nowrap">
                        {inv.ocr_confidence != null && inv.ocr_confidence > 0 ? (
                          <span
                            className={
                              inv.ocr_confidence >= 0.85
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : inv.ocr_confidence >= 0.6
                                ? 'text-amber-600'
                                : 'text-destructive'
                            }
                          >
                            {Math.round(inv.ocr_confidence * 100)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className={`px-2 py-1.5 text-right sticky right-0 z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] min-w-[105px] ${
                        isSelected ? 'bg-primary/10 dark:bg-primary/15' : 'bg-card'
                      }`}>
                        {inv.error_code === 'OTHER_DOCUMENT' || statusFilter === 'other' || !inv.invoice_id ? (
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              variant="warning"
                              size="sm"
                              className="h-6 px-2 text-[10px] font-semibold gap-1 shrink-0"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await apiService.reprocessJob(inv.job_id, 'invoice');
                                  onShowToast(`Reprocessing ${inv.original_filename || 'document'}...`);
                                  await loadInvoices();
                                } catch (err: any) {
                                  onShowToast(err.message || 'Reprocessing failed');
                                }
                              }}
                              title="Rerun OCR and parse document"
                            >
                              <RefreshCw className="w-3 h-3" /> Rerun OCR
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingDocument(inv);
                              }}
                              title="View document and extracted details"
                            >
                              <Eye className="w-3 h-3 text-muted-foreground" /> View
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 inline-flex items-center justify-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvoicesToDelete([inv]);
                              }}
                              title="Delete document"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1">
                            {/* Lock / Unlock button to the left of Review */}
                            {inv.is_period_locked ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                className="size-6 p-0 text-purple-600/70 opacity-60 cursor-not-allowed shrink-0 inline-flex items-center justify-center"
                                title={`Period locked (${inv.locked_year_name || 'Closed FY'})`}
                              >
                                <Lock className="w-3 h-3" />
                              </Button>
                            ) : (!inv.requires_human_review || inv.job_status === 'completed') && currentUser?.role !== 'restricted' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!inv.invoice_id) return;
                                  try {
                                    await apiService.unlockInvoice(inv.invoice_id);
                                    onShowToast(`Invoice ${inv.invoice_number} unlocked for editing`);
                                    await loadInvoices();
                                  } catch (err: any) {
                                    onShowToast(err.message || 'Failed to unlock invoice');
                                  }
                                }}
                                className="size-6 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 transition-colors shrink-0 inline-flex items-center justify-center"
                                title="Unlock for Editing"
                              >
                                <Unlock className="w-3 h-3" />
                              </Button>
                            ) : null}

                            {/* Review button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px] font-semibold shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (inv.invoice_id) {
                                  onSelectInvoice(
                                    inv.invoice_id,
                                    invoices.map((i) => i.invoice_id).filter(Boolean) as string[]
                                  );
                                }
                              }}
                            >
                              Review
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={inv.is_period_locked}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (inv.is_period_locked) return;
                                setInvoicesToDelete([inv]);
                              }}
                              className={`size-6 p-0 shrink-0 inline-flex items-center justify-center transition-colors ${
                                inv.is_period_locked
                                  ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                                  : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                              }`}
                              title={inv.is_period_locked ? `Period locked (${inv.locked_year_name || 'Closed FY'})` : 'Delete invoice'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Page Subtotal */}
            {invoices.length > 0 && (() => {
              const subtotalGross = Math.round(invoices.reduce((sum, inv) => sum + Number(inv.total_gross || 0), 0) * 100) / 100;
              const subtotalVat = Math.round(invoices.reduce((sum, inv) => {
                const g = Number(inv.total_gross || 0);
                const v = inv.total_vat != null ? Number(inv.total_vat) : (inv.total_net != null ? Math.round((g - Number(inv.total_net)) * 100) / 100 : 0);
                return sum + v;
              }, 0) * 100) / 100;
              const subtotalNet = Math.round(invoices.reduce((sum, inv) => {
                const g = Number(inv.total_gross || 0);
                const v = inv.total_vat != null ? Number(inv.total_vat) : (inv.total_net != null ? Math.round((g - Number(inv.total_net)) * 100) / 100 : 0);
                const n = inv.total_net != null ? Number(inv.total_net) : Math.round((g - v) * 100) / 100;
                return sum + n;
              }, 0) * 100) / 100;

              return (
                <tfoot className="border-t-2 border-border bg-muted font-mono text-[11px]">
                  <tr>
                    <td className="sticky bottom-0 bg-muted z-20 w-9 px-2 py-2 text-center border-t-2 border-border shadow-[0_-4px_8px_-2px_rgba(0,0,0,0.06)]" />
                    <td className="sticky bottom-0 bg-muted z-20 px-2.5 py-2 font-normal text-foreground border-t-2 border-border shadow-[0_-4px_8px_-2px_rgba(0,0,0,0.06)]" colSpan={3}>
                      <span className="font-sans font-bold text-foreground text-[11px]">Page {page} Subtotal</span>{' '}
                      <span className="text-[10px] text-muted-foreground font-sans font-normal">
                        ({invoices.length} {invoices.length === 1 ? 'document' : 'documents'})
                      </span>
                    </td>
                    <td className="sticky bottom-0 bg-muted z-20 px-2.5 py-2 text-right font-bold text-foreground border-t-2 border-border shadow-[0_-4px_8px_-2px_rgba(0,0,0,0.06)]">
                      {formatCurrency(subtotalNet)}
                    </td>
                    <td className="sticky bottom-0 bg-muted z-20 px-2.5 py-2 text-right font-bold text-foreground border-t-2 border-border shadow-[0_-4px_8px_-2px_rgba(0,0,0,0.06)]">
                      {formatCurrency(subtotalVat)}
                    </td>
                    <td className="sticky bottom-0 bg-muted z-20 px-2.5 py-2 text-right font-bold text-foreground border-t-2 border-border shadow-[0_-4px_8px_-2px_rgba(0,0,0,0.06)]">
                      {formatCurrency(subtotalGross)}
                    </td>
                    <td colSpan={2} className="sticky bottom-0 bg-muted z-20 px-2 py-2 text-center text-[10px] font-sans font-bold text-foreground whitespace-nowrap border-t-2 border-border shadow-[0_-4px_8px_-2px_rgba(0,0,0,0.06)]">
                      Page Total
                    </td>
                    <td className="sticky bottom-0 right-0 bg-muted z-30 px-2 py-2 text-right text-[10px] font-sans text-muted-foreground min-w-[105px] border-t-2 border-border shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06),0_-4px_8px_-2px_rgba(0,0,0,0.06)]" />
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-2.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground bg-card/60">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              Showing <span className="text-foreground font-normal">{invoices.length}</span> of <span className="text-foreground font-normal">{totalCount}</span> invoices
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-normal">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setPageSize(newSize);
                  localStorage.setItem('invparse_invoices_page_size', String(newSize));
                  setPage(1);
                }}
                className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground font-normal focus:outline-none focus:border-primary cursor-pointer"
                aria-label="Invoices per page"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="font-normal text-foreground text-xs">
              Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page * pageSize >= totalCount}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 w-7"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(invoicesToDelete && invoicesToDelete.length > 0)}
        onClose={() => !isDeleting && setInvoicesToDelete(null)}
        title={invoicesToDelete && invoicesToDelete.length > 1 ? 'Delete Selected Invoices' : 'Delete Invoice'}
        subtitle={
          invoicesToDelete && invoicesToDelete.length > 1
            ? `Confirm deletion of ${invoicesToDelete.length} documents from accounting records`
            : 'Confirm document deletion from accounting records'
        }
        maxWidth={invoicesToDelete && invoicesToDelete.length > 1 ? 'md' : 'sm'}
      >
        {invoicesToDelete && invoicesToDelete.length > 0 && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <p className="font-bold text-foreground text-sm">
                  {invoicesToDelete.length === 1
                    ? `Delete document ${invoicesToDelete[0].invoice_number || invoicesToDelete[0].original_filename}?`
                    : `Delete ${invoicesToDelete.length} documents?`}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {invoicesToDelete.length === 1 ? (
                    <>
                      This will remove document <strong className="text-foreground font-semibold">{invoicesToDelete[0].invoice_number || invoicesToDelete[0].original_filename}</strong> ({invoicesToDelete[0].seller_name || 'Unprocessed'}) and its extracted data from this workspace.
                    </>
                  ) : (
                    <>
                      This will permanently remove the following <strong className="text-foreground font-semibold">{invoicesToDelete.length}</strong> documents and their extracted data from this workspace.
                    </>
                  )}
                </p>
              </div>
            </div>

            {invoicesToDelete.some((i) => i.is_period_locked) && (
              <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-800 dark:text-purple-300 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  {invoicesToDelete.filter((i) => i.is_period_locked).length} document(s) belong to a closed accounting period and cannot be deleted.
                </span>
              </div>
            )}

            {/* If multiple invoices, render a scrollable preview list */}
            {invoicesToDelete.length > 1 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border/60 bg-muted/20">
                {invoicesToDelete.map((inv) => (
                  <div key={inv.invoice_id || inv.job_id} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-foreground flex items-center gap-1.5">
                        <span>{inv.invoice_number || inv.original_filename}</span>
                        {inv.is_period_locked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-sans font-medium flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Locked ({inv.locked_year_name || 'Closed FY'})
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-[11px] truncate max-w-[220px]">
                        {inv.seller_name || inv.original_filename} • {inv.invoice_date || 'No Date'}
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-foreground">
                      {inv.total_gross ? formatCurrency(inv.total_gross, inv.currency) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setInvoicesToDelete(null)}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isDeleting || invoicesToDelete.every((i) => i.is_period_locked)}
                onClick={handleDeleteInvoices}
                className="gap-1.5 text-sm font-bold shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting
                  ? 'Deleting...'
                  : invoicesToDelete.filter((i) => !i.is_period_locked).length > 1
                  ? `Delete ${invoicesToDelete.filter((i) => !i.is_period_locked).length} Invoices`
                  : invoicesToDelete.filter((i) => !i.is_period_locked).length === 1
                  ? 'Delete Invoice'
                  : 'Cannot Delete Locked Invoices'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Document Viewer Modal for viewing source documents (statements, failed, in-progress, etc.) */}
      <DocumentViewerModal
        isOpen={Boolean(viewingDocument)}
        onClose={() => setViewingDocument(null)}
        item={viewingDocument}
        onShowToast={onShowToast}
        onReloadList={loadInvoices}
        onOpenReview={(id) => {
          setViewingDocument(null);
          onSelectInvoice(
            id,
            invoices.map((i) => i.invoice_id).filter(Boolean) as string[]
          );
        }}
      />
    </div>
  );
};
