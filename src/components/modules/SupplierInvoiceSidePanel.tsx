import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  ExternalLink,
  FileText,
  Banknote,
  Layers,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SupplierInvoice, InvoiceDetail } from '../../types/api';
import { apiService } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InvoiceCanvas } from '../review/InvoiceCanvas';
import { formatAppDate } from '../../lib/dateUtils';

const formatDate = (dateStr: string | null | undefined): string => formatAppDate(dateStr);

interface SupplierInvoiceSidePanelProps {
  invoice: SupplierInvoice | null;
  supplierName?: string;
  onClose: () => void;
  onEdit: (invoiceId: string) => void;
}

export const SupplierInvoiceSidePanel: React.FC<SupplierInvoiceSidePanelProps> = ({
  invoice,
  supplierName,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'lines'>('document');
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load full invoice details and document images when invoice changes
  useEffect(() => {
    if (!invoice?.id) {
      setInvoiceDetail(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const data = await apiService.getInvoiceDetails(invoice.id);
        if (isMounted) {
          setInvoiceDetail(data);
        }
      } catch (err: any) {
        console.warn('Failed to load full invoice details for preview canvas:', err);
        if (isMounted) {
          setDetailError(err.message || 'Could not load original document image');
        }
      } finally {
        if (isMounted) {
          setLoadingDetail(false);
        }
      }
    };

    fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [invoice?.id]);

  if (!invoice) return null;

  // Synthesize InvoiceDetail from SupplierInvoice if full detail is not yet loaded
  const fallbackDetail: InvoiceDetail = {
    id: invoice.id,
    job_id: invoice.job_id,
    tenant_id: '',
    organization_id: '',
    created_by_user_id: '',
    invoice_number: invoice.invoice_number || 'INV',
    invoice_date: invoice.invoice_date || '',
    due_date: invoice.due_date || '',
    currency: invoice.currency || 'EUR',
    seller_name: supplierName || 'Supplier',
    seller_vat: '',
    buyer_name: '',
    buyer_vat: '',
    total_net: Number(invoice.total_net) || 0,
    total_vat: Number(invoice.total_vat) || 0,
    total_gross: Number(invoice.total_gross) || 0,
    requires_human_review: invoice.requires_human_review ?? false,
    ocr_confidence: 0.95,
    line_items: (invoice.line_items || []).map((li, idx) => ({
      id: li.id || `line-${idx}`,
      line_number: Number(li.line_number) || idx + 1,
      description: li.description || '',
      item_code: li.item_code,
      quantity: li.quantity !== null && li.quantity !== undefined ? Number(li.quantity) : 1,
      unit_price: li.unit_price !== null && li.unit_price !== undefined ? Number(li.unit_price) : 0,
      vat_rate: li.vat_rate !== null && li.vat_rate !== undefined ? Number(li.vat_rate) : 0,
      vat_code: li.vat_code || 'T23',
      tax_amount: li.tax_amount !== null && li.tax_amount !== undefined ? Number(li.tax_amount) : 0,
      vat_amount: li.tax_amount !== null && li.tax_amount !== undefined ? Number(li.tax_amount) : 0,
      net_amount: li.net_amount !== null && li.net_amount !== undefined ? Number(li.net_amount) : 0,
      gross_amount: li.gross_amount !== null && li.gross_amount !== undefined ? Number(li.gross_amount) : 0,
      xero_account_code: li.xero_account_code || '300',
      vat_deductible: true,
      income_tax_deductible: true,
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    payment_method: invoice.payment_method,
    payment_status: invoice.payment_status,
    amount_paid: invoice.amount_paid,
    is_cash_paid: invoice.is_cash_paid,
    payment_details: invoice.payment_details,
  };

  const effectiveDetail = invoiceDetail || fallbackDetail;
  const lineItems = invoice.line_items || [];

  const isCreditNote =
    Number(invoice.total_gross) < 0 ||
    Number(invoice.total_net) < 0 ||
    Boolean(invoice.invoice_number && invoice.invoice_number.toLowerCase().includes('crn')) ||
    Boolean(invoice.payment_method && String(invoice.payment_method).toLowerCase().includes('credit'));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel Drawer */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[600px] md:w-[700px] lg:w-[780px] xl:w-[860px] bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-label={`${isCreditNote ? 'Credit Note' : 'Invoice'} ${invoice.invoice_number || invoice.id}`}
      >
        {/* Top Header & Actions */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isCreditNote
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground truncate">
                  {isCreditNote
                    ? `Credit Note #${invoice.invoice_number || 'CRN'}`
                    : `Invoice #${invoice.invoice_number || 'INV'}`}
                </h2>
                {isCreditNote && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1 shrink-0 font-bold uppercase tracking-wider"
                  >
                    Credit Note
                  </Badge>
                )}
                {invoice.is_cash_paid && (
                  <Badge
                    variant="warning"
                    className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 shrink-0"
                  >
                    <Banknote className="w-3 h-3" /> Cash Settled
                  </Badge>
                )}
                {invoice.requires_human_review ? (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    Review Required
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-[10px] shrink-0">
                    Approved
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {supplierName || 'Supplier'} • {invoice.invoice_date ? formatDate(invoice.invoice_date) : 'No Date'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Edit & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onEdit(invoice.id || invoice.job_id)}
              className="h-8 text-xs font-bold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              title="Open full editing mode in Review Hub"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
              title="Close panel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Overview Metrics Strip */}
        <div className="px-4 py-3 bg-muted/20 border-b border-border/80 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-card border border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Net Amount</span>
              <span className="font-mono font-bold text-foreground text-sm">
                {formatCurrency(invoice.total_net)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">VAT Amount</span>
              <span className="font-mono font-bold text-foreground text-sm">
                {formatCurrency(invoice.total_vat)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Gross</span>
              <span
                className={`font-mono font-black text-sm ${
                  isCreditNote
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {isCreditNote
                  ? `-${formatCurrency(Math.abs(Number(invoice.total_gross) || 0))}`
                  : formatCurrency(invoice.total_gross)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Due Date</span>
              <span className="font-medium text-foreground text-xs">
                {invoice.due_date ? formatDate(invoice.due_date) : 'On Receipt'}
              </span>
            </div>
          </div>

          {/* Cash Settlement Banner */}
          {invoice.is_cash_paid && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold">Settled in Cash / Point of Delivery</span>
                  {invoice.payment_details && (
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {invoice.payment_details}
                    </p>
                  )}
                </div>
              </div>
              {invoice.amount_paid !== null && invoice.amount_paid !== undefined && (
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                  Paid: {formatCurrency(invoice.amount_paid)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* View Tabs Selector */}
        <div className="px-4 pt-2.5 pb-2 border-b border-border bg-card flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('document')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'document'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Document Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lines')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'lines'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Itemized Lines ({lineItems.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {activeTab === 'document' ? 'Scanned OCR & original file' : `${lineItems.length} lines extracted`}
          </span>
        </div>

        {/* Tab Body: Document Canvas or Line Items Table */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-muted/5">
          {activeTab === 'document' ? (
            <div className="h-full flex flex-col p-3">
              {detailError && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{detailError}</span>
                </div>
              )}
              {loadingDetail && !invoiceDetail ? (
                <div className="h-full min-h-[350px] flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span>Loading original invoice document...</span>
                </div>
              ) : (
                <div className="flex-1 min-h-[400px] border border-border rounded-xl overflow-hidden bg-muted/20">
                  <InvoiceCanvas invoice={effectiveDetail} />
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {lineItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="font-semibold text-foreground">No itemized line items</p>
                  <p className="text-[11px] mt-1">This invoice has no extracted line items.</p>
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-muted text-[10px] uppercase font-bold text-muted-foreground border-b border-border tracking-wider">
                        <tr>
                          <th className="py-2 px-2.5 w-10 text-center">#</th>
                          <th className="py-2 px-2.5">Description</th>
                          <th className="py-2 px-2.5 text-right">Qty</th>
                          <th className="py-2 px-2.5 text-right">Unit Price</th>
                          <th className="py-2 px-2.5 text-right">Net</th>
                          <th className="py-2 px-2.5 text-center">VAT</th>
                          <th className="py-2 px-2.5 text-right">Gross</th>
                          <th className="py-2 px-2.5 text-center">GL Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {lineItems.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2 px-2.5 text-center font-mono text-muted-foreground text-[10px]">
                              {item.line_number ?? idx + 1}
                            </td>
                            <td className="py-2 px-2.5">
                              <div className="font-bold text-foreground text-[11px]">{item.description || '—'}</div>
                              {item.item_code && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  SKU: {item.item_code}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-muted-foreground text-[11px]">
                              {item.quantity ?? '—'}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-muted-foreground text-[11px]">
                              {item.unit_price !== null && item.unit_price !== undefined
                                ? formatCurrency(item.unit_price)
                                : '—'}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-semibold text-foreground text-[11px]">
                              {item.net_amount !== null && item.net_amount !== undefined
                                ? formatCurrency(item.net_amount)
                                : '—'}
                            </td>
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border">
                                {item.vat_code || (item.vat_rate !== null ? `${item.vat_rate}%` : '—')}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-foreground text-[11px]">
                              {item.gross_amount !== null && item.gross_amount !== undefined
                                ? formatCurrency(item.gross_amount)
                                : '—'}
                            </td>
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              {item.xero_account_code ? (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                  {item.xero_account_code}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Lines Footer Totals */}
                  <div className="p-2.5 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-[11px]">
                    <span className="text-muted-foreground text-[10px]">
                      {lineItems.length} line item{lineItems.length === 1 ? '' : 's'} totaling{' '}
                      <strong className={`font-mono text-[11px] ${isCreditNote ? 'text-purple-600 dark:text-purple-400' : 'text-foreground'}`}>
                        {isCreditNote
                          ? `-${formatCurrency(Math.abs(Number(invoice.total_gross) || 0))}`
                          : formatCurrency(invoice.total_gross)}
                      </strong>
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(invoice.id || invoice.job_id)}
                      className="h-6 px-2 text-[10px] font-semibold gap-1.5 self-end sm:self-auto"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Lines in Review Hub</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Footer Bar */}
        <div className="p-3.5 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            ID: {invoice.id}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onEdit(invoice.id || invoice.job_id)}
              className="h-8 text-xs font-bold gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Review Hub</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};
