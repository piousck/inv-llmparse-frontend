import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Search,
  Edit2,
  Save,
  X,
  Sparkles,
  ArrowLeft,
  FileText,
  CreditCard,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Receipt,
  ArrowUpDown,
  Banknote,
} from 'lucide-react';
import { Supplier, SupplierActivity, SupplierInvoice, SupplierPayment } from '../../types/api';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { SupplierInvoiceSidePanel } from './SupplierInvoiceSidePanel';

interface SuppliersViewProps {
  activeOrgId: string;
  onShowToast: (msg: string) => void;
  onSelectInvoice?: (jobOrInvoiceId: string) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  activeOrgId,
  onShowToast,
  onSelectInvoice,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected supplier for Accounting Ledger Drill-Down View
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [activity, setActivity] = useState<SupplierActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState<boolean>(false);

  // Drill-down expanded row and filter state in Ledger View
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'invoices' | 'payments'>('all');
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'desc' | 'asc'>('desc');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Selected invoice for right-hand side panel preview
  const [previewInvoice, setPreviewInvoice] = useState<SupplierInvoice | null>(null);

  // Edit Supplier Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState({
    canonical_name: '',
    vat_number: '',
    iban: '',
    address: '',
    business_description: '',
    is_active: true,
  });
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  useEffect(() => {
    loadSuppliers();
    setSelectedSupplierId(null);
    setActivity(null);
    setPreviewInvoice(null);
  }, [activeOrgId]);

  useEffect(() => {
    if (selectedSupplierId) {
      loadSupplierActivity(selectedSupplierId);
    } else {
      setActivity(null);
      setExpandedRowId(null);
      setPreviewInvoice(null);
      setLedgerFilter('all');
      setLedgerSearch('');
    }
  }, [selectedSupplierId]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const list = await apiService.getSuppliers(activeOrgId);
      setSuppliers(list);
    } catch (err) {
      console.error(err);
      onShowToast('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierActivity = async (supplierId: string) => {
    setLoadingActivity(true);
    try {
      const data = await apiService.getSupplierActivity(activeOrgId, supplierId);
      setActivity(data);
    } catch (err) {
      console.error(err);
      onShowToast('Failed to load supplier activity ledger');
      const sup = suppliers.find((s) => s.id === supplierId);
      if (sup) {
        setActivity({
          supplier: sup,
          invoices: [],
          payments: [],
          total_invoiced: Number(sup.total_invoiced) || 0,
          total_paid: Number(sup.total_paid) || 0,
          balance: Number(sup.balance) || 0,
        });
      }
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleOpenEditModal = (sup: Supplier, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingSupplier(sup);
    setEditForm({
      canonical_name: sup.canonical_name || '',
      vat_number: sup.vat_number || '',
      iban: sup.iban || '',
      address: sup.address || '',
      business_description: sup.business_description || '',
      is_active: sup.is_active !== undefined ? sup.is_active : true,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSupplier) return;
    setSavingEdit(true);
    try {
      const updated = await apiService.updateSupplier(activeOrgId, editingSupplier.id, {
        canonical_name: editForm.canonical_name,
        vat_number: editForm.vat_number,
        iban: editForm.iban,
        address: editForm.address,
        business_description: editForm.business_description,
        is_active: editForm.is_active,
      });

      // Update local suppliers list
      setSuppliers((prev) =>
        prev.map((s) => (s.id === editingSupplier.id ? { ...s, ...updated } : s))
      );

      // If currently viewing this supplier's ledger, update activity state
      if (activity && activity.supplier.id === editingSupplier.id) {
        setActivity((prev) => (prev ? { ...prev, supplier: { ...prev.supplier, ...updated } } : null));
      }

      setIsEditModalOpen(false);
      onShowToast('Supplier details updated successfully.');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to update supplier details');
    } finally {
      setSavingEdit(false);
    }
  };

  const formatCurrency = (val: number | string | null | undefined) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter suppliers by search query
  const filteredSuppliers = suppliers.filter((sup) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = sup.canonical_name?.toLowerCase().includes(q);
    const vatMatch = sup.vat_number?.toLowerCase().includes(q);
    const ibanMatch = sup.iban?.toLowerCase().includes(q);
    const addrMatch = sup.address?.toLowerCase().includes(q);
    const aliasMatch = sup.aliases?.some((a) => a.toLowerCase().includes(q));
    return nameMatch || vatMatch || ibanMatch || addrMatch || aliasMatch;
  });

  // Calculate high-level directory totals
  const totalBilledAll = suppliers.reduce((acc, s) => acc + (Number(s.total_invoiced) || 0), 0);
  const totalPaidAll = suppliers.reduce((acc, s) => acc + (Number(s.total_paid) || 0), 0);
  const totalBalanceAll = suppliers.reduce((acc, s) => acc + (Number(s.balance) || 0), 0);

  // --------------------------------------------------------------------------
  // Chronological Supplier Ledger Calculation (with Running Balances)
  // --------------------------------------------------------------------------
  interface LedgerRow {
    id: string;
    type: 'invoice' | 'payment';
    isCreditNote?: boolean;
    date: string | null;
    sortTimestamp: number;
    reference: string;
    description: string;
    status: string;
    statusVariant: 'success' | 'warning' | 'secondary';
    billedAmount: number;
    paidAmount: number;
    runningBalance: number;
    invoiceData?: SupplierInvoice;
    paymentData?: SupplierPayment;
  }

  const ledgerRows = useMemo(() => {
    if (!activity) return [];

    const rawList: {
      type: 'invoice' | 'payment';
      date: string | null;
      sortTimestamp: number;
      invoice?: SupplierInvoice;
      payment?: SupplierPayment;
    }[] = [];

    for (const inv of activity.invoices) {
      const d = inv.invoice_date || '';
      const ts = d ? new Date(d).getTime() : 0;
      rawList.push({ type: 'invoice', date: inv.invoice_date, sortTimestamp: ts, invoice: inv });
    }

    for (const pmt of activity.payments) {
      const d = pmt.txn_date || pmt.created_at || '';
      const ts = d ? new Date(d).getTime() : 0;
      rawList.push({ type: 'payment', date: pmt.txn_date || pmt.created_at, sortTimestamp: ts, payment: pmt });
    }

    // Sort ascending chronologically to compute running balance from start
    rawList.sort((a, b) => a.sortTimestamp - b.sortTimestamp);

    let running = 0;
    const computed: LedgerRow[] = rawList
      .map((item) => {
        if (item.type === 'invoice' && item.invoice) {
          const gross = Number(item.invoice.total_gross) || 0;
          const net = Number(item.invoice.total_net) || 0;
          const isCredit = Boolean(
            gross < 0 ||
            net < 0 ||
            (item.invoice.invoice_number && item.invoice.invoice_number.toLowerCase().includes('crn')) ||
            (item.invoice.payment_method && String(item.invoice.payment_method).toLowerCase().includes('credit'))
          );
          running += gross;
          const isApproved = !item.invoice.requires_human_review;
          const refNumber = item.invoice.invoice_number;
          const refText = refNumber
            ? isCredit
              ? `Credit Note #${refNumber}`
              : `Invoice #${refNumber}`
            : isCredit
            ? 'Credit Note'
            : 'Invoice';
          return {
            id: `inv-${item.invoice.id}`,
            type: 'invoice' as const,
            isCreditNote: isCredit,
            date: item.date,
            sortTimestamp: item.sortTimestamp,
            reference: refText,
            description: `${item.invoice.line_items?.length || 0} line item${item.invoice.line_items?.length === 1 ? '' : 's'} · Net: ${formatCurrency(item.invoice.total_net)} · VAT: ${formatCurrency(item.invoice.total_vat)}`,
            status: isApproved ? 'Approved' : 'Needs Review',
            statusVariant: (isApproved ? 'success' : 'warning') as 'success' | 'warning',
            billedAmount: gross,
            paidAmount: 0,
            runningBalance: running,
            invoiceData: item.invoice,
          };
        } else if (item.type === 'payment' && item.payment) {
          const paid = Number(item.payment.allocated_amount) || 0;
          running -= paid;
          const isConfirmed = item.payment.status === 'auto' || item.payment.status === 'confirmed';
          return {
            id: `pmt-${item.payment.id}`,
            type: 'payment' as const,
            date: item.date,
            sortTimestamp: item.sortTimestamp,
            reference: item.payment.invoice_number
              ? `Allocated to #${item.payment.invoice_number}`
              : (item.payment.reference_text || 'Direct Payment'),
            description: item.payment.txn_description || item.payment.reference_text || 'Bank statement allocation',
            status: item.payment.status === 'auto' ? 'Auto-Matched' : item.payment.status === 'confirmed' ? 'Confirmed' : 'Pending Review',
            statusVariant: (isConfirmed ? 'success' : 'warning') as 'success' | 'warning',
            billedAmount: 0,
            paidAmount: paid,
            runningBalance: running,
            paymentData: item.payment,
          };
        }
        return null!;
      })
      .filter(Boolean);

    let filtered = computed;
    if (ledgerFilter === 'invoices') {
      filtered = filtered.filter((r) => r.type === 'invoice');
    } else if (ledgerFilter === 'payments') {
      filtered = filtered.filter((r) => r.type === 'payment');
    }

    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.reference.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.date && r.date.toLowerCase().includes(q)) ||
          r.status.toLowerCase().includes(q) ||
          (r.invoiceData?.invoice_number && r.invoiceData.invoice_number.toLowerCase().includes(q)) ||
          (r.paymentData?.txn_description && r.paymentData.txn_description.toLowerCase().includes(q))
      );
    }

    return ledgerSortOrder === 'desc'
      ? [...filtered].sort((a, b) => b.sortTimestamp - a.sortTimestamp)
      : [...filtered].sort((a, b) => a.sortTimestamp - b.sortTimestamp);
  }, [activity, ledgerFilter, ledgerSearch, ledgerSortOrder]);

  // --------------------------------------------------------------------------
  // VIEW 1: Accounting Activity Ledger Drill-Down View
  // --------------------------------------------------------------------------
  if (selectedSupplierId) {
    const sup = activity?.supplier || suppliers.find((s) => s.id === selectedSupplierId);

    return (
      <div className="flex-1 p-6 md:p-8 flex flex-col bg-background gap-6">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={() => setSelectedSupplierId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-muted/40 hover:bg-muted px-3 py-1.5 rounded-lg border border-border"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Supplier Directory
            </button>

            {sup && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleOpenEditModal(sup, e)}
                className="h-8 text-xs gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Supplier Profile
              </Button>
            )}
          </div>

          {sup && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                        {sup.canonical_name}
                      </h1>
                      <Badge variant={sup.is_active ? 'success' : 'secondary'}>
                        {sup.is_active ? 'Active Vendor' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">VAT: {sup.vat_number || 'N/A'}</span>
                      {sup.iban && <span>· IBAN: {sup.iban}</span>}
                      {sup.address && <span>· {sup.address}</span>}
                    </div>

                    {sup.aliases && sup.aliases.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">Known Aliases:</span>
                        {sup.aliases.map((a) => (
                          <span
                            key={a}
                            className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-mono"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="bg-muted/40 border border-border rounded-xl p-3 min-w-[120px]">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Total Invoiced
                    </div>
                    <div className="text-base font-black text-foreground mt-0.5">
                      {formatCurrency(activity ? activity.total_invoiced : sup.total_invoiced)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {activity ? activity.invoices.length : sup.invoice_count || 0} bills
                    </div>
                  </div>

                  <div className="bg-muted/40 border border-border rounded-xl p-3 min-w-[120px]">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Total Paid
                    </div>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatCurrency(activity ? activity.total_paid : sup.total_paid)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {activity ? activity.payments.length : 0} payments
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 min-w-[140px]">
                    <div className="text-[10px] uppercase font-bold text-primary tracking-wider">
                      Outstanding Balance
                    </div>
                    <div className="text-base font-black text-primary mt-0.5">
                      {formatCurrency(activity ? activity.balance : sup.balance)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Net Payables</div>
                  </div>
                </div>
              </div>

              {/* Bio & AI Context Preview */}
              {sup.business_description && (
                <div className="mt-4 pt-4 border-t border-border flex items-start gap-2 text-xs text-muted-foreground">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-foreground">Accounting Context: </strong>
                    {sup.business_description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Proper Accounting Ledger Table */}
        {loadingActivity ? (
          <div className="p-16 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border flex flex-col items-center justify-center gap-2.5">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading supplier transactions and calculating running balances...</span>
          </div>
        ) : !activity ? (
          <div className="p-12 text-center text-xs bg-card rounded-xl border border-border flex flex-col items-center gap-3">
            <p className="text-muted-foreground">Unable to load activity ledger from server.</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => selectedSupplierId && loadSupplierActivity(selectedSupplierId)}
            >
              Retry Loading Ledger
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Ledger Filter & Controls Toolbar */}
            <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60 self-start">
                <button
                  type="button"
                  onClick={() => setLedgerFilter('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    ledgerFilter === 'all'
                      ? 'bg-card text-foreground shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Transactions ({activity.invoices.length + activity.payments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerFilter('invoices')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    ledgerFilter === 'invoices'
                      ? 'bg-card text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  Bills ({activity.invoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerFilter('payments')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    ledgerFilter === 'payments'
                      ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                  Payments ({activity.payments.length})
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search reference, narrative..."
                    className="w-full pl-8 pr-8 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  {ledgerSearch && (
                    <button
                      type="button"
                      onClick={() => setLedgerSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLedgerSortOrder(ledgerSortOrder === 'desc' ? 'asc' : 'desc')}
                  className="h-8 text-xs gap-1.5 shrink-0"
                  title="Toggle chronological sorting order"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {ledgerSortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                </Button>
              </div>
            </div>

            {/* Main Ledger Table */}
            <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-3 w-8"></th>
                      <th className="py-3 px-3 w-28">Date</th>
                      <th className="py-3 px-3 w-28">Type</th>
                      <th className="py-3 px-4 w-44">Reference</th>
                      <th className="py-3 px-4">Description / Details</th>
                      <th className="py-3 px-3 text-center w-28">Status</th>
                      <th className="py-3 px-4 text-right w-32">Billed (+/-)</th>
                      <th className="py-3 px-4 text-right w-32">Paid (-)</th>
                      <th className="py-3 px-4 text-right w-36">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledgerRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-xs text-muted-foreground">
                          {ledgerSearch || ledgerFilter !== 'all'
                            ? 'No transactions match the selected filter or search keywords.'
                            : 'No invoice or payment activity recorded for this vendor yet.'}
                        </td>
                      </tr>
                    ) : (
                      ledgerRows.map((row) => {
                        const isExpanded = expandedRowId === row.id;
                        const isInvoice = row.type === 'invoice';

                        return (
                          <React.Fragment key={row.id}>
                            <tr
                              onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                              className={`cursor-pointer transition-colors ${
                                isInvoice
                                  ? row.isCreditNote
                                    ? 'hover:bg-purple-500/5'
                                    : 'hover:bg-blue-500/5'
                                  : 'hover:bg-emerald-500/5'
                              } ${
                                isExpanded
                                  ? isInvoice
                                    ? row.isCreditNote
                                      ? 'bg-purple-500/5'
                                      : 'bg-blue-500/5'
                                    : 'bg-emerald-500/5'
                                  : ''
                              } ${
                                isInvoice && previewInvoice?.id === row.invoiceData?.id
                                  ? row.isCreditNote
                                    ? 'bg-purple-500/10 ring-1 ring-purple-500/40'
                                    : 'bg-blue-500/10 ring-1 ring-blue-500/40'
                                  : ''
                              }`}
                            >
                              {/* Expand chevron */}
                              <td className="py-3 px-3 text-muted-foreground text-center">
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-primary" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                              </td>

                              {/* Date */}
                              <td className="py-3 px-3 font-medium text-foreground whitespace-nowrap">
                                {formatDate(row.date)}
                              </td>

                              {/* Type badge */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {isInvoice ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {row.isCreditNote ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                        <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Credit Note
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                        <FileText className="w-3 h-3" /> Bill
                                      </span>
                                    )}
                                    {row.invoiceData?.is_cash_paid && (
                                      <span
                                        title={row.invoiceData.payment_details || 'Paid in Cash'}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                      >
                                        <Banknote className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Cash
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <CreditCard className="w-3 h-3" /> Payment
                                  </span>
                                )}
                              </td>

                              {/* Reference */}
                              <td className="py-3 px-4 font-mono font-bold text-foreground">
                                {isInvoice && row.invoiceData ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewInvoice(row.invoiceData!);
                                    }}
                                    className={`text-left font-mono font-bold hover:underline inline-flex items-center gap-1.5 group cursor-pointer ${
                                      row.isCreditNote
                                        ? 'text-purple-600 dark:text-purple-400'
                                        : 'text-blue-600 dark:text-blue-400'
                                    }`}
                                    title={`Click to preview ${row.isCreditNote ? 'credit note' : 'invoice'} on right-hand side`}
                                  >
                                    <span>{row.reference}</span>
                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                ) : (
                                  row.reference
                                )}
                              </td>

                              {/* Description */}
                              <td className="py-3 px-4 text-muted-foreground">
                                <div className="line-clamp-1">{row.description}</div>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <Badge variant={row.statusVariant} className="text-[10px] px-2 py-0.5">
                                  {row.status}
                                </Badge>
                              </td>

                              {/* Billed (+/-) */}
                              <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                                {isInvoice ? (
                                  row.isCreditNote ? (
                                    <span className="font-bold text-purple-600 dark:text-purple-400">
                                      -{formatCurrency(Math.abs(row.billedAmount))}
                                    </span>
                                  ) : (
                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                      +{formatCurrency(row.billedAmount)}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>

                              {/* Paid (-) */}
                              <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                                {!isInvoice ? (
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    -{formatCurrency(row.paidAmount)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>

                              {/* Running Balance */}
                              <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                                <span
                                  className={
                                    row.runningBalance > 0
                                      ? 'text-foreground font-extrabold'
                                      : row.runningBalance < 0
                                      ? 'text-blue-500 font-extrabold'
                                      : 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                                  }
                                >
                                  {formatCurrency(row.runningBalance)}
                                </span>
                              </td>
                            </tr>

                            {/* Drill Down Detail Row */}
                            {isExpanded && (
                              <tr className="bg-muted/15 border-b border-border/80">
                                <td colSpan={9} className="p-4 bg-muted/10">
                                  {isInvoice && row.invoiceData ? (
                                    /* Invoice Line Items Drill Down */
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <FileText
                                            className={`w-4 h-4 ${
                                              row.isCreditNote
                                                ? 'text-purple-600 dark:text-purple-400'
                                                : 'text-blue-500'
                                            }`}
                                          />
                                          <span className="text-xs font-bold text-foreground">
                                            Itemized Lines for {row.reference}
                                          </span>
                                          <span className="text-[11px] text-muted-foreground">
                                            ({row.invoiceData.line_items.length} line item{row.invoiceData.line_items.length === 1 ? '' : 's'})
                                          </span>
                                        </div>

                                        {row.invoiceData && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setPreviewInvoice(row.invoiceData!)}
                                            className="h-6 text-xs gap-1 text-primary hover:text-primary font-semibold"
                                            title="Preview invoice on right-hand side"
                                          >
                                            <ExternalLink className="w-3 h-3" /> View in Review Hub
                                          </Button>
                                        )}
                                      </div>

                                      {row.invoiceData.is_cash_paid && (
                                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200">
                                          <div className="flex items-center gap-2">
                                            <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <div>
                                              <span className="font-semibold text-xs">Settled in Cash / Point of Delivery</span>
                                              {row.invoiceData.payment_details && (
                                                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                                                  {row.invoiceData.payment_details}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          {row.invoiceData.amount_paid !== null && row.invoiceData.amount_paid !== undefined && (
                                            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                              Paid: {formatCurrency(row.invoiceData.amount_paid)}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {row.invoiceData.line_items.length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-2">
                                          No itemized line items recorded for this invoice.
                                        </p>
                                      ) : (
                                        <div className="border border-border rounded-lg overflow-hidden bg-card text-xs">
                                          <table className="w-full text-left border-collapse">
                                            <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
                                              <tr>
                                                <th className="py-1.5 px-3 w-8">#</th>
                                                <th className="py-1.5 px-3">Description</th>
                                                <th className="py-1.5 px-3 w-28">GL Account</th>
                                                <th className="py-1.5 px-3 w-20">VAT</th>
                                                <th className="py-1.5 px-3 text-right w-24">Net</th>
                                                <th className="py-1.5 px-3 text-right w-24">Gross</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                              {row.invoiceData.line_items.map((item) => (
                                                <tr key={item.id} className="hover:bg-muted/20">
                                                  <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
                                                    {item.line_number}
                                                  </td>
                                                  <td className="py-2 px-3">
                                                    <div className="font-medium text-foreground">
                                                      {item.description || '—'}
                                                    </div>
                                                    {item.item_code && (
                                                      <span className="text-[10px] text-muted-foreground font-mono">
                                                        SKU: {item.item_code}
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-3">
                                                    <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">
                                                      {item.xero_account_code || 'Unassigned'}
                                                    </span>
                                                  </td>
                                                  <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                                                    {item.vat_rate !== null ? `${Number(item.vat_rate)}%` : '—'}
                                                  </td>
                                                  <td className="py-2 px-3 text-right font-mono text-[11px]">
                                                    {formatCurrency(item.net_amount)}
                                                  </td>
                                                  <td className="py-2 px-3 text-right font-mono font-bold text-[11px] text-foreground">
                                                    {formatCurrency(item.gross_amount)}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  ) : row.paymentData ? (
                                    /* Payment Reconciliation Drill Down */
                                    <div className="space-y-2.5">
                                      <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-emerald-500" />
                                        <span className="text-xs font-bold text-foreground">
                                          Bank Reconciliation & Allocation Details
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-card border border-border rounded-lg text-xs">
                                        <div>
                                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                            Bank Statement Narrative
                                          </span>
                                          <p className="text-foreground mt-0.5 font-mono text-[11px] break-words">
                                            {row.paymentData.txn_description || 'N/A'}
                                          </p>
                                        </div>

                                        <div>
                                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                            Payment Reference
                                          </span>
                                          <p className="text-foreground mt-0.5 font-mono text-[11px]">
                                            {row.paymentData.reference_text || 'N/A'}
                                          </p>
                                        </div>

                                        <div>
                                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                            Matching Engine
                                          </span>
                                          <p className="text-foreground mt-0.5 capitalize">
                                            {row.paymentData.match_method.replace('_', ' ')} ({(Number(row.paymentData.confidence_score) * 100).toFixed(0)}% conf.)
                                          </p>
                                        </div>

                                        <div>
                                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                            Linked Invoice
                                          </span>
                                          <p className="text-foreground mt-0.5 font-semibold">
                                            {row.paymentData.invoice_number ? `Invoice #${row.paymentData.invoice_number}` : 'Direct Account Payment'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
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
        )}

        {/* Supplier Invoice Right-Hand Side Panel Preview */}
        {previewInvoice && (
          <SupplierInvoiceSidePanel
            invoice={previewInvoice}
            supplierName={sup?.canonical_name}
            onClose={() => setPreviewInvoice(null)}
            onEdit={(invId) => {
              setPreviewInvoice(null);
              if (onSelectInvoice) {
                onSelectInvoice(invId);
              }
            }}
          />
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW 2: Main Accounting Supplier Directory Table
  // --------------------------------------------------------------------------
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col bg-background gap-6">
      {/* Header with Title and Overall Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
            Supplier Master Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Accounting vendor directory with live balances, Irish VAT identification, automated statement matching, and drill-down transaction ledgers.
          </p>
        </div>

        {/* Directory Overall Metrics */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-card border border-border rounded-xl px-3.5 py-2 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Vendors
            </span>
            <span className="text-sm font-black text-foreground">{suppliers.length}</span>
          </div>

          <div className="bg-card border border-border rounded-xl px-3.5 py-2 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Total Invoiced
            </span>
            <span className="text-sm font-black text-foreground">
              {formatCurrency(totalBilledAll)}
            </span>
          </div>

          <div className="bg-card border border-border rounded-xl px-3.5 py-2 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Total Paid
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalPaidAll)}
            </span>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl px-3.5 py-2 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-primary block">
              Total Payables Balance
            </span>
            <span className="text-sm font-black text-primary">
              {formatCurrency(totalBalanceAll)}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by supplier name, VAT number, IBAN, or address..."
            className="w-full pl-9 pr-9 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filteredSuppliers.length}</span> of {suppliers.length} vendors
        </div>
      </div>

      {/* Main Table Card */}
      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border">
          Loading supplier master directory...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground bg-card/40 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-2">
          <Building2 className="w-8 h-8 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">
            {searchTerm ? 'No suppliers match your search filter' : 'No suppliers registered or extracted yet'}
          </p>
          <p className="max-w-md text-muted-foreground">
            {searchTerm
              ? 'Try adjusting your search keywords.'
              : 'Suppliers are automatically registered and populated here when invoices and receipts are uploaded.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">VAT / Tax ID</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-center">Bills</th>
                  <th className="py-3 px-4 text-right">Total Invoiced</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSuppliers.map((sup) => {
                  const bal = Number(sup.balance) || 0;

                  return (
                    <tr
                      key={sup.id}
                      onClick={() => setSelectedSupplierId(sup.id)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors group"
                    >
                      {/* Supplier Name + Aliases */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSupplierId(sup.id);
                              }}
                              className="font-bold text-foreground text-sm group-hover:text-primary hover:underline transition-colors text-left cursor-pointer"
                              title="Click to view supplier activity ledger"
                            >
                              {sup.canonical_name}
                            </button>
                            {sup.aliases && sup.aliases.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {sup.aliases.slice(0, 2).map((a) => (
                                  <span
                                    key={a}
                                    className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground text-[10px] font-mono"
                                  >
                                    {a}
                                  </span>
                                ))}
                                {sup.aliases.length > 2 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{sup.aliases.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* VAT Number */}
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {sup.vat_number || 'N/A'}
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                        {sup.address || '—'}
                      </td>

                      {/* Invoice Count */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSupplierId(sup.id);
                          }}
                          className="px-2.5 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] transition-colors cursor-pointer"
                          title="Click to view activity ledger"
                        >
                          {sup.invoice_count || 0} bill{sup.invoice_count === 1 ? '' : 's'}
                        </button>
                      </td>

                      {/* Total Invoiced */}
                      <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                        {formatCurrency(sup.total_invoiced)}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(sup.total_paid)}
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-mono font-bold text-xs ${
                            bal > 0
                              ? 'text-primary'
                              : bal < 0
                              ? 'text-blue-500'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {formatCurrency(sup.balance)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <Badge variant={sup.is_active ? 'success' : 'secondary'} className="text-[11px] px-2 py-0.5">
                          {sup.is_active ? 'Active Vendor' : 'Inactive'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSupplierId(sup.id);
                            }}
                            className="h-7 text-xs gap-1 font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20"
                            title="Open two-column drill-down activity ledger"
                          >
                            <Receipt className="w-3 h-3" /> View Ledger
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleOpenEditModal(sup, e)}
                            className="h-7 text-xs gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Supplier Profile"
        subtitle="Update vendor details, tax registrations, and AI extraction context rules."
        maxWidth="lg"
      >
        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1">
              Canonical Supplier Name
            </label>
            <input
              type="text"
              value={editForm.canonical_name}
              onChange={(e) => setEditForm({ ...editForm, canonical_name: e.target.value })}
              placeholder="e.g. Musgrave MarketPlace"
              className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1">
                VAT Registration Number
              </label>
              <input
                type="text"
                value={editForm.vat_number}
                onChange={(e) => setEditForm({ ...editForm, vat_number: e.target.value })}
                placeholder="e.g. IE1234567T"
                className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1">
                IBAN / Bank Identifier
              </label>
              <input
                type="text"
                value={editForm.iban}
                onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })}
                placeholder="e.g. IE29AIBK931152..."
                className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1">
              Registered Business Address
            </label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              placeholder="e.g. St. Margaret's Road, Ballymun, Dublin 11"
              className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1 flex items-center gap-1 text-primary">
              <Sparkles className="w-3.5 h-3.5" /> Supplier Business Profile & AI Context
            </label>
            <textarea
              rows={3}
              value={editForm.business_description}
              onChange={(e) => setEditForm({ ...editForm, business_description: e.target.value })}
              placeholder="e.g. Wholesale grocery distributor. All lines are goods for resale under Section 60(2)..."
              className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              This description instructs the extraction pipeline how to classify GL accounts and apply Irish VAT exemptions for this vendor.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <input
              type="checkbox"
              id="is_active"
              checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
            <label htmlFor="is_active" className="text-xs font-medium text-foreground cursor-pointer">
              Active Vendor (allowed for matching and invoice processing)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
