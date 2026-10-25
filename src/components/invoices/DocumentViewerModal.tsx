import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  FileText,
  Landmark,
  AlertTriangle,
  Clock,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { InvoiceListItem, JobResponse } from '../../types/api';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../lib/utils';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InvoiceListItem | null;
  onShowToast: (msg: string) => void;
  onReloadList: () => void;
  onOpenReview?: (invoiceId: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  item,
  onShowToast,
  onReloadList,
  onOpenReview,
}) => {
  const [jobDetails, setJobDetails] = useState<JobResponse | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>('');
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(true);
  const [isReocring, setIsReocring] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);

  useEffect(() => {
    if (!isOpen || !item) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      setBlobUrl(null);
      setTextContent(null);
      setJobDetails(null);
      setLoadingDoc(false);
      setZoom(1);
      return;
    }

    let isMounted = true;
    setLoadingDoc(true);

    const loadData = async () => {
      try {
        // 1. Fetch live job status & metadata
        const job = await apiService.getJobStatus(item.job_id);
        if (isMounted) setJobDetails(job);

        // 2. Fetch binary document blob
        const docBlob = await apiService.getJobDocumentBlob(item.job_id);
        if (isMounted && docBlob) {
          setBlobUrl(docBlob.blobUrl);
          setContentType(docBlob.contentType);
          if (docBlob.textContent) {
            setTextContent(docBlob.textContent);
          }
        }
      } catch (err) {
        console.warn('[DocumentViewerModal] Error loading document preview:', err);
      } finally {
        if (isMounted) setLoadingDoc(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, item?.job_id]);

  if (!isOpen || !item) return null;

  const handleRerunOcr = async () => {
    setIsReocring(true);
    try {
      await apiService.reprocessJob(item.job_id);
      onShowToast(`Re-running OCR for ${item.original_filename || 'document'}...`);

      // Poll until status transitions
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const updated = await apiService.getJobStatus(item.job_id);
          setJobDetails(updated);
          if (
            updated.status === 'completed' ||
            updated.status === 'needs_review' ||
            updated.status === 'failed' ||
            attempts >= 25
          ) {
            clearInterval(interval);
            setIsReocring(false);
            onReloadList();
          }
        } catch {
          if (attempts >= 20) {
            clearInterval(interval);
            setIsReocring(false);
          }
        }
      }, 1500);
    } catch (err: any) {
      setIsReocring(false);
      onShowToast(err.message || 'Failed to reprocess document');
    }
  };

  const isPdf =
    contentType.includes('pdf') ||
    (item.original_filename && item.original_filename.toLowerCase().endsWith('.pdf'));

  const isImage =
    contentType.includes('image') ||
    (item.original_filename &&
      /\.(jpe?g|png|webp|gif)$/i.test(item.original_filename));

  const isText =
    Boolean(textContent) ||
    contentType.includes('text') ||
    (item.original_filename && item.original_filename.toLowerCase().endsWith('.txt'));

  // Extraction results (from Job response or item fallback)
  const jobResult = jobDetails?.result || {};
  const isSupplierStatement =
    item.processing_path === 'supplier_statement' ||
    item.document_type === 'supplier_statement' ||
    jobDetails?.processing_path === 'supplier_statement' ||
    jobResult?.type === 'supplier_statement';

  const isBankStatement =
    item.processing_path === 'bank_statement' ||
    item.document_type === 'bank_statement' ||
    jobDetails?.processing_path === 'bank_statement' ||
    jobResult?.type === 'bank_statement';

  const isFailed =
    item.job_status === 'failed' ||
    jobDetails?.status === 'failed';

  const reconciliation = jobResult?.reconciliation || {};
  const transactions: any[] = reconciliation?.transactions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-background rounded-2xl border border-border shadow-2xl flex flex-col w-full max-w-6xl h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-border bg-card/60 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-muted/60 text-foreground shrink-0">
              {isBankStatement ? (
                <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : isSupplierStatement ? (
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              ) : isFailed ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <FileText className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-foreground truncate max-w-md">
                  {item.original_filename || 'Uploaded Document'}
                </h2>
                {isSupplierStatement && (
                  <Badge variant="outline" className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[11px] font-semibold py-0.5">
                    Supplier Stmt
                  </Badge>
                )}
                {isBankStatement && (
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-semibold py-0.5">
                    Bank Stmt
                  </Badge>
                )}
                {isFailed && (
                  <Badge variant="destructive" className="text-[11px] font-semibold py-0.5">
                    Failed Upload
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate font-mono">
                Job ID: {item.job_id} • Uploaded: {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action Bar with Orange Rerun OCR Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Primary Orange Rerun OCR Button */}
            <Button
              variant="warning"
              size="sm"
              onClick={handleRerunOcr}
              disabled={isReocring}
              title="Re-run multimodal vision OCR and extraction pipeline on this document"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReocring ? 'animate-spin' : ''}`} />
              {isReocring ? 'Running OCR...' : 'Rerun OCR'}
            </Button>

            {item.invoice_id && onOpenReview && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenReview(item.invoice_id!);
                }}
                className="text-xs h-8 px-3 gap-1"
              >
                Open Review <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {blobUrl && (
              <a
                href={blobUrl}
                download={item.original_filename || 'document'}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Download source document"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ml-1"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split Screen */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Pane: Document Canvas / Preview */}
          <div className="flex-1 bg-muted/20 border-r border-border flex flex-col min-w-0 overflow-hidden relative">
            {/* Canvas Toolbar for Image / Zoom */}
            <div className="p-2 border-b border-border/60 bg-card/40 flex items-center justify-between text-xs text-muted-foreground px-4">
              <span className="font-mono text-[11px]">
                Preview: {contentType || (isPdf ? 'application/pdf' : isImage ? 'image' : 'file')}
              </span>
              {isImage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                    className="p-1 rounded hover:bg-muted text-foreground cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[10px] w-10 text-center">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                    className="p-1 rounded hover:bg-muted text-foreground cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="p-1 rounded hover:bg-muted text-foreground cursor-pointer ml-1"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Document Render Surface */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/30">
              {loadingDoc ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Loading document stream...</span>
                </div>
              ) : blobUrl && isPdf ? (
                <object
                  data={`${blobUrl}#view=FitH`}
                  type="application/pdf"
                  className="w-full h-full rounded-xl shadow-xs border border-border/80 bg-white"
                  title="PDF Document"
                >
                  <div className="flex flex-col items-center justify-center p-8 text-center text-xs">
                    <FileText className="w-10 h-10 text-muted-foreground/50 mb-2" />
                    <p className="font-medium text-foreground">PDF Preview unavailable in this browser frame</p>
                    <a
                      href={blobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 text-primary underline font-bold flex items-center gap-1"
                    >
                      Open PDF in new tab <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </object>
              ) : blobUrl && isImage ? (
                <div className="max-w-full max-h-full overflow-auto flex items-center justify-center">
                  <img
                    src={blobUrl}
                    alt={item.original_filename || 'Document Image'}
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-md border border-border/80 transition-transform"
                  />
                </div>
              ) : isText && textContent ? (
                <div className="w-full h-full bg-card rounded-xl p-4 overflow-auto border border-border shadow-xs">
                  <div className="font-mono text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                    {textContent}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="font-semibold text-foreground text-sm">
                    {item.original_filename || 'Source Document'}
                  </p>
                  <p className="text-xs mt-1">Raw preview not directly embeddable for this format.</p>
                  {blobUrl && (
                    <a
                      href={blobUrl}
                      download={item.original_filename || 'document'}
                      className="mt-4 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Document
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Parsed Data & Diagnosis */}
          <div className="w-full md:w-[420px] lg:w-[460px] bg-card flex flex-col shrink-0 overflow-y-auto divide-y divide-border/60">
            {/* Status & Diagnostic Header */}
            <div className="p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Document Classification & Status
              </h3>

              {isFailed ? (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Processing Failure ({item.error_code || jobDetails?.error_code || 'ERROR'})</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/90">
                    {item.error_message || jobDetails?.error_message || 'The extraction engine encountered an error parsing this document.'}
                  </p>
                  <div className="pt-2 border-t border-destructive/20 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Remedy: Click Rerun OCR to re-parse.</span>
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={handleRerunOcr}
                      disabled={isReocring}
                    >
                      <RefreshCw className={`w-3 h-3 ${isReocring ? 'animate-spin' : ''}`} />
                      Rerun OCR
                    </Button>
                  </div>
                </div>
              ) : isSupplierStatement ? (
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Supplier Statement Reconciled
                    </span>
                    <Badge variant="outline" className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 text-[10px]">
                      {reconciliation?.status || 'PROCESSED'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Transactions extracted and checked against purchase invoices in this workspace.
                  </p>
                </div>
              ) : isBankStatement ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" /> Bank Statement Ingested
                    </span>
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-[10px]">
                      COMPLETED
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bank statement transactions are ready for automated feed reconciliation.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {item.job_status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Document is currently registered under status: {item.job_status}
                  </p>
                </div>
              )}
            </div>

            {/* Extracted Metadata Fields */}
            <div className="p-5 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Document Details
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    {isSupplierStatement ? 'Supplier Name' : isBankStatement ? 'Institution' : 'Seller / Entity'}
                  </span>
                  <span className="font-semibold text-foreground truncate block mt-0.5">
                    {reconciliation?.supplier_name || item.seller_name || '—'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    {isSupplierStatement ? 'Account #' : 'Ref / Number'}
                  </span>
                  <span className="font-mono font-semibold text-foreground truncate block mt-0.5">
                    {reconciliation?.account_number || item.invoice_number || '—'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Date
                  </span>
                  <span className="font-mono text-foreground block mt-0.5">
                    {reconciliation?.statement_date || item.invoice_date || '—'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Total Amount
                  </span>
                  <span className="font-mono font-bold text-foreground block mt-0.5">
                    {reconciliation?.total_balance != null
                      ? formatCurrency(reconciliation.total_balance, reconciliation.currency || item.currency)
                      : item.total_gross != null && item.total_gross > 0
                      ? formatCurrency(item.total_gross, item.currency)
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Statement Transactions Breakdown (If Supplier Statement) */}
            {isSupplierStatement && (
              <div className="p-5 space-y-3 flex-1 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Statement Transactions ({transactions.length})
                  </h3>
                  {reconciliation?.summary && (
                    <span className="text-[11px] text-muted-foreground">
                      Missing: <strong>{reconciliation.summary.missing_in_system ?? 0}</strong>
                    </span>
                  )}
                </div>

                {transactions.length > 0 ? (
                  <div className="flex-1 overflow-auto rounded-lg border border-border/70 divide-y divide-border/60 bg-muted/10 max-h-64">
                    {transactions.map((tx, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-foreground flex items-center gap-1.5">
                            <span>{tx.reference || tx.txn_type || `Item #${idx + 1}`}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-sans font-medium bg-muted text-muted-foreground border border-border/60">
                              {tx.txn_date || '—'}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {tx.description || tx.match_status || 'Line Item'}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-semibold text-foreground">
                            {formatCurrency(tx.amount, reconciliation.currency || item.currency)}
                          </div>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              tx.match_status === 'MATCHED'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : 'bg-amber-500/15 text-amber-600'
                            }`}
                          >
                            {tx.match_status || 'TRANSACTION'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
                    No transactions listed in this reconciliation.
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions Footer */}
            <div className="p-4 mt-auto bg-muted/30 border-t border-border space-y-2">
              <Button
                variant="warning"
                size="md"
                onClick={handleRerunOcr}
                disabled={isReocring}
                className="w-full"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReocring ? 'animate-spin' : ''}`} />
                {isReocring ? 'Reprocessing...' : 'Rerun OCR'}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Uses visual LLM to re-extract all fields, line items, and totals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
