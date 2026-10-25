import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Sparkles,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  X,
  Loader2,
  Cpu,
  Landmark,
  FileSpreadsheet,
  FileImage,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { apiService } from '../../services/api';
import { JobStatus, Organization, IndustryCode, IndustryPreset, INDUSTRY_PRESETS, BankAccountDto } from '../../types/api';
import { NavTab } from '../layout/Sidebar';

export interface UploadQueueItem {
  id: string;
  file: File;
  status: 'queued' | 'quarantined' | 'processing' | 'completed' | 'failed';
  statusMessage?: string;
  jobId?: string;
  invoiceId?: string;
  error?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrgId: string;
  activeOrg?: Organization;
  initialType?: 'invoice' | 'bank_statement';
  onSelectTab?: (tab: NavTab) => void;
  onUploadSuccess: (invoiceId: string, allIds?: string[], targetTab?: NavTab) => void;
  onShowToast: (msg: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  activeOrgId,
  activeOrg,
  initialType = 'invoice',
  onSelectTab,
  onUploadSuccess,
  onShowToast,
}) => {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [llmModel, setLlmModel] = useState<string>('google/gemini-3.5-flash-lite');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryCode>(
    activeOrg?.industry || 'retail_wholesale'
  );
  const [industryPresets, setIndustryPresets] = useState<IndustryPreset[]>(INDUSTRY_PRESETS);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    apiService.getIndustryPresets().then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setIndustryPresets(res);
      }
    });
  }, []);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<'invoice' | 'bank_statement'>(initialType);

  useEffect(() => {
    if (isOpen && initialType) {
      setDocumentType(initialType);
    }
  }, [isOpen, initialType]);

  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);
  const [newAccountName, setNewAccountName] = useState<string>('');
  const [newAccountBank, setNewAccountBank] = useState<string>('AIB');

  useEffect(() => {
    if (activeOrgId) {
      apiService.listBankAccounts(activeOrgId).then((accs) => {
        setBankAccounts(accs);
        if (accs.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accs[0].id);
        }
      });
    }
  }, [activeOrgId]);

  useEffect(() => {
    if (activeOrg?.industry) {
      setSelectedIndustry(activeOrg.industry);
    }
  }, [activeOrg]);

  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([
    { id: 'google/gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (Fastest & Default)' },
    { id: 'openai/gpt-oss-20b:free', name: 'GPT-OSS 20B Free (OpenAI)' },
    { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'Nemotron Nano 9B Free (Nvidia)' },
    { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B Free (Google)' },
    { id: 'meta-llama/llama-3.3-8b-instruct:free', name: 'Llama 3.3 8B Instruct (Meta)' },
  ]);

  useEffect(() => {
    apiService.getLlmModels().then((models) => {
      if (models && models.length > 0) {
        setAvailableModels(
          models.map((m) => {
            let label = m;
            if (m.includes('gemini-3.5-flash-lite')) label = 'Gemini 3.5 Flash Lite (Fastest & Default)';
            else if (m.includes('gpt-oss-20b')) label = 'GPT-OSS 20B Free (OpenAI)';
            else if (m.includes('nemotron-nano-9b')) label = 'Nemotron Nano 9B Free (Nvidia)';
            else if (m.includes('gemma-4-26b')) label = 'Gemma 4 26B Free (Google)';
            else if (m.includes('llama-3.3-8b')) label = 'Llama 3.3 8B Instruct (Meta)';
            return { id: m, name: label };
          })
        );
        if (!models.includes(llmModel)) {
          setLlmModel(models[0]);
        }
      }
    });
  }, []);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen && !isUploading) {
      setQueue([]);
      setCurrentIndex(-1);
    }
  }, [isOpen, isUploading]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    if (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.tiff') ||
      lower.endsWith('.tif') ||
      lower.endsWith('.bmp')
    ) {
      return <FileImage className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
  };

  const getFileTypeBadge = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
      return (
        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          CSV
        </span>
      );
    }
    if (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.tiff') ||
      lower.endsWith('.tif') ||
      lower.endsWith('.bmp')
    ) {
      const ext = lower.split('.').pop()?.toUpperCase() || 'IMG';
      return (
        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
          {ext}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        PDF
      </span>
    );
  };

  const addFilesToQueue = (newFiles: FileList | File[]) => {
    const validFiles: UploadQueueItem[] = [];
    const MAX_SIZE = 35 * 1024 * 1024; // 35 MB

    const invoiceAllowed = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp'];
    const bankAllowed = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.webp', '.bmp', '.csv', '.tsv', '.txt'];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      if (file.size > MAX_SIZE) {
        onShowToast(`File "${file.name}" exceeds maximum size limit of 35 MB`);
        continue;
      }

      const lower = file.name.toLowerCase();
      const isAllowed =
        documentType === 'invoice'
          ? invoiceAllowed.some((ext) => lower.endsWith(ext))
          : bankAllowed.some((ext) => lower.endsWith(ext));

      if (!isAllowed) {
        onShowToast(
          documentType === 'invoice'
            ? `File "${file.name}" is not supported. Please upload PDF, PNG, JPG, or TIFF invoices.`
            : `File "${file.name}" is not supported. Please upload CSV, PDF, or Image (PNG, JPG, WebP) bank statements.`
        );
        continue;
      }

      validFiles.push({
        id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`,
        file,
        status: 'queued',
      });
    }

    if (validFiles.length > 0) {
      setQueue((prev) => [...prev, ...validFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
    // Clear input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    if (isUploading) return;
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    if (isUploading) return;
    setQueue([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartUpload = async () => {
    if (queue.length === 0 || isUploading) return;

    if (documentType === 'bank_statement') {
      if (!selectedAccountId) {
        onShowToast('Please select or create a bank account first');
        return;
      }
      onSelectTab?.('bank');

      setIsUploading(true);
      let successCount = 0;
      let hasFailures = false;

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        setCurrentIndex(i);

        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? { ...q, status: 'processing', statusMessage: 'Extracting transactions & reconciling balances...' }
              : q
          )
        );

        try {
          const res = await apiService.uploadBankStatement(
            item.file,
            activeOrgId,
            selectedAccountId,
            llmModel
          );

          if (res.redirected_to_invoice) {
            const isSales = res.document_type === 'sales_invoice';
            const docLabel = isSales ? 'sales document' : (res.document_type || 'purchase invoice');
            const targetLabel = isSales ? 'Sales Invoices' : 'Purchase Invoices';
            setQueue((prev) =>
              prev.map((q, idx) =>
                idx === i
                  ? {
                      ...q,
                      status: 'completed',
                      statusMessage: `Identified as ${docLabel} — routed to ${targetLabel}`,
                    }
                  : q
              )
            );
            successCount++;
          } else if (res.redirected_to_supplier_statement) {
            setQueue((prev) =>
              prev.map((q, idx) =>
                idx === i
                  ? {
                      ...q,
                      status: 'completed',
                      statusMessage: 'Identified as supplier statement — routed to Statement Reconciliation',
                    }
                  : q
              )
            );
            successCount++;
          } else if (res.status === 'reconciled') {
            setQueue((prev) =>
              prev.map((q, idx) =>
                idx === i
                  ? {
                      ...q,
                      status: 'completed',
                      statusMessage: `Reconciled (${res.transaction_count} txns, balanced)`,
                    }
                  : q
              )
            );
            successCount++;
          } else if (res.status === 'extracted') {
            setQueue((prev) =>
              prev.map((q, idx) =>
                idx === i
                  ? {
                      ...q,
                      status: 'completed',
                      statusMessage: `Extracted (${res.transaction_count} txns, no balances)`,
                    }
                  : q
              )
            );
            successCount++;
          } else {
            hasFailures = true;
            const discrepancy = res.reconciliation?.discrepancy != null
              ? `€${res.reconciliation.discrepancy.toFixed(2)}`
              : 'exceeded tolerance';
            setQueue((prev) =>
              prev.map((q, idx) =>
                idx === i
                  ? {
                      ...q,
                      status: 'failed',
                      error: `Reconciliation discrepancy: ${discrepancy}`,
                      statusMessage: `Discrepancy: ${discrepancy}`,
                    }
                  : q
              )
            );
          }
        } catch (err: any) {
          hasFailures = true;
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? {
                    ...q,
                    status: 'failed',
                    error: err?.message || 'Bank statement processing failed',
                    statusMessage: err?.message || 'Failed',
                  }
                : q
            )
          );
        }
      }

      setIsUploading(false);
      setCurrentIndex(-1);
      if (successCount > 0) {
        onShowToast(`Successfully processed ${successCount} bank statement(s)`);
        onSelectTab?.('bank');
        onUploadSuccess('', []);
        if (!hasFailures) {
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      }
      return;
    }

    setIsUploading(true);
    const processedInvoiceIds: string[] = [];
    let bankStatementCount = 0;
    let otherDocumentCount = 0;
    let hasFailures = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      setCurrentIndex(i);

      // Step 1: Quarantined scanning
      setQueue((prev) =>
        prev.map((q, idx) =>
          idx === i
            ? { ...q, status: 'quarantined', statusMessage: 'Scanning antimalware (quarantine)...' }
            : q
        )
      );

      try {
        const uploadRes = await apiService.uploadInvoice(
          item.file,
          activeOrgId,
          llmModel,
          selectedIndustry
        );
        const jobId = uploadRes.job_id;

        // In mock mode, invoice is synthesized immediately
        if (apiService.getMode() === 'mock' && uploadRes.invoice_id) {
          const isMerged = processedInvoiceIds.includes(uploadRes.invoice_id);
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? {
                    ...q,
                    status: 'processing',
                    statusMessage: 'Visual LLM layout & Irish VAT analysis...',
                  }
                : q
            )
          );
          await new Promise((r) => setTimeout(r, 600));

          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? {
                    ...q,
                    status: 'completed',
                    invoiceId: uploadRes.invoice_id!,
                    statusMessage: isMerged ? 'Merged into invoice' : 'Extracted & balanced',
                  }
                : q
            )
          );
          processedInvoiceIds.push(uploadRes.invoice_id);
          continue;
        }

        // Live mode: polling Celery worker job status
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: 'processing',
                  jobId,
                  statusMessage: 'OCR & Visual LLM pipeline active...',
                }
              : q
          )
        );

        let completed = false;
        let attempts = 0;
        const maxAttempts = 60; // 90s max wait

        while (!completed && attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 1500));
          attempts++;

          try {
            const job = await apiService.getJobStatus(jobId);
            const currentStatus = (job.status || '').toLowerCase() as JobStatus;

            // 1. Auto-detected Bank Statement triage branch
            if (job.processing_path === 'bank_statement') {
              completed = true;
              bankStatementCount++;
              const txnCount = job.result?.transaction_count || 0;
              const importedCount = job.result?.imported_count ?? txnCount;
              const dupCount = job.result?.duplicate_count || 0;
              const stmtId = job.result?.statement_id ? `${job.result.statement_id.slice(0, 8)}…` : '';
              const msg =
                dupCount > 0
                  ? `Recognized as Bank Statement: ${importedCount} imported, ${dupCount} duplicate(s) pending review — Statement ID: ${stmtId}`
                  : `Recognized and processed as Bank Statement (${txnCount} transactions) — Statement ID: ${stmtId}`;
              setQueue((prev) =>
                prev.map((q, idx) =>
                  idx === i
                    ? {
                        ...q,
                        status: 'completed',
                        statusMessage: msg,
                      }
                    : q
                )
              );
              onShowToast(msg);
              break;
            }

            // 2. Auto-detected Supplier Statement triage branch
            if (job.processing_path === 'supplier_statement' || job.result?.type === 'supplier_statement') {
              completed = true;
              const recon = job.result?.reconciliation || {};
              const suppName = recon.supplier_name || 'Supplier';
              const status = recon.status || 'COMPLETED';
              const summary = recon.summary || {};
              const msg = `Recognized as Supplier Statement (${suppName}) — Status: ${status} (${summary.matched_invoices ?? 0} matched, ${summary.missing_in_system ?? 0} missing)`;
              setQueue((prev) =>
                prev.map((q, idx) =>
                  idx === i
                    ? {
                        ...q,
                        status: 'completed',
                        statusMessage: msg,
                      }
                    : q
                )
              );
              onShowToast(msg);
              break;
            }

            // 3. Non-accounting triage branch (Other Documents)
            if (job.processing_path === 'other' || job.error_code === 'OTHER_DOCUMENT') {
              completed = true;
              otherDocumentCount++;
              const docType = job.result?.document_type || 'other';
              const msg = `Classified as non-accounting document (${docType}). Moved to Other Documents.`;
              setQueue((prev) =>
                prev.map((q, idx) =>
                  idx === i
                    ? {
                        ...q,
                        status: 'completed',
                        statusMessage: msg,
                      }
                    : q
                )
              );
              onShowToast(msg);
              break;
            }

            if (currentStatus === 'completed' || currentStatus === 'needs_review' || currentStatus === 'partial_review') {
              completed = true;
              const invId = job.invoice_id;
              const isMerged = Boolean(invId && processedInvoiceIds.includes(invId));
              if (invId) {
                processedInvoiceIds.push(invId);
              }
              const defaultMsg = currentStatus === 'partial_review'
                ? (job.error_message || 'Partial invoice (awaiting missing page)')
                : isMerged
                ? 'Merged into invoice'
                : 'Extracted & balanced';
              setQueue((prev) =>
                prev.map((q, idx) =>
                  idx === i
                    ? {
                        ...q,
                        status: 'completed',
                        invoiceId: invId || undefined,
                        statusMessage: defaultMsg,
                      }
                    : q
                )
              );
            } else if (currentStatus === 'failed') {
              completed = true;
              hasFailures = true;
              setQueue((prev) =>
                prev.map((q, idx) =>
                  idx === i
                    ? {
                        ...q,
                        status: 'failed',
                        error: job.error_message || 'Extraction failed',
                        statusMessage: job.error_message || 'Extraction failed',
                      }
                    : q
                )
              );
            }
          } catch (pollErr) {
            console.warn('[UploadModal] Poll error:', pollErr);
          }
        }

        if (!completed) {
          hasFailures = true;
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? { ...q, status: 'failed', error: 'Extraction timed out' }
                : q
            )
          );
        }
      } catch (err: any) {
        hasFailures = true;
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: 'failed',
                  error: err?.detail || err?.message || 'Upload failed',
                  statusMessage: err?.detail || err?.message || 'Upload failed',
                }
              : q
          )
        );
      }
    }

    setIsUploading(false);
    setCurrentIndex(-1);

    const uniqueInvoiceIds = Array.from(new Set(processedInvoiceIds));
    if (uniqueInvoiceIds.length > 0) {
      const mergedCount = processedInvoiceIds.length - uniqueInvoiceIds.length;
      onShowToast(
        mergedCount > 0
          ? `Processed ${processedInvoiceIds.length} pages into ${uniqueInvoiceIds.length} invoice`
          : `Successfully processed ${uniqueInvoiceIds.length} ${
              uniqueInvoiceIds.length === 1 ? 'invoice' : 'invoices'
            }`
      );
      if (hasFailures) {
        onShowToast(`Completed with warnings: ${uniqueInvoiceIds.length} succeeded, review failed items.`);
      }
    } else if (bankStatementCount > 0) {
      onShowToast(`Document recognized as Bank Statement and processed! Switching to Bank Reconciliation.`);
      onSelectTab?.('bank');
    } else if (otherDocumentCount > 0) {
      onShowToast(`Non-accounting document(s) routed to 'Other Documents' for manual review.`);
      onSelectTab?.('invoices');
    }
  };

  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const failedCount = queue.filter((q) => q.status === 'failed').length;
  const processedCount = completedCount + failedCount;
  const totalBytes = queue.reduce((acc, q) => acc + q.file.size, 0);

  const isFinished = queue.length > 0 && !isUploading && processedCount === queue.length;
  const completedInvoices = queue
    .filter((q) => q.status === 'completed' && q.invoiceId)
    .map((q) => q.invoiceId as string);
  const uniqueCompletedInvoiceIds = Array.from(new Set(completedInvoices));

  const handleDoneClose = () => {
    onClose();
    if (documentType === 'bank_statement') {
      onSelectTab?.('bank');
      onUploadSuccess('', [], 'bank');
    } else {
      onSelectTab?.('invoices');
      onUploadSuccess('', uniqueCompletedInvoiceIds, 'invoices');
    }
  };

  const handleReviewInvoice = () => {
    onClose();
    if (uniqueCompletedInvoiceIds.length > 0) {
      onUploadSuccess(uniqueCompletedInvoiceIds[0], uniqueCompletedInvoiceIds, 'invoices');
    } else {
      onUploadSuccess('', [], 'invoices');
    }
  };

  const handleModalClose = () => {
    if (isUploading) return;
    if (isFinished && completedCount > 0) {
      handleDoneClose();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={documentType === 'invoice' ? 'Upload Purchase Invoices' : 'Upload Bank Statements'}
      subtitle={
        documentType === 'invoice'
          ? 'Select or drop single or multiple invoices for automated Irish VAT & GL extraction'
          : 'Upload CSV, PDF, or Pictures/Photos (PNG, JPG, WebP) of bank statements for automated transcription, reconciliation & matching'
      }
      maxWidth="lg"
      footer={
        isFinished ? (
          <>
            {documentType === 'invoice' && uniqueCompletedInvoiceIds.length === 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReviewInvoice}
                className="gap-1.5 text-xs font-semibold"
              >
                Review Invoice
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleDoneClose}
              className="gap-1.5 text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Close
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={handleModalClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartUpload}
              disabled={queue.length === 0 || isUploading}
              className="gap-1.5 text-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {documentType === 'invoice'
                    ? `Extracting (${processedCount}/${queue.length})...`
                    : `Processing (${processedCount}/${queue.length})...`}
                </>
              ) : documentType === 'invoice' ? (
                queue.length > 1 ? (
                  `Start Extraction (${queue.length} Files)`
                ) : queue.length === 1 ? (
                  'Start Extraction (1 File)'
                ) : (
                  'Start Extraction'
                )
              ) : queue.length > 1 ? (
                `Upload Bank Statements (${queue.length} Files)`
              ) : queue.length === 1 ? (
                'Upload Bank Statement (1 File)'
              ) : (
                'Upload Bank Statement'
              )}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4 text-sm">
        {/* Document Type Selector Toggle */}
        <div className="flex p-1 bg-muted/60 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => {
              if (!isUploading) {
                setDocumentType('invoice');
                clearQueue();
                onSelectTab?.('invoices');
              }
            }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              documentType === 'invoice'
                ? 'bg-card text-primary shadow-sm border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            Purchase Invoices
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isUploading) {
                setDocumentType('bank_statement');
                clearQueue();
                onSelectTab?.('bank');
              }
            }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              documentType === 'bank_statement'
                ? 'bg-card text-primary shadow-sm border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Landmark className="w-4 h-4" />
            Bank Statements
          </button>
        </div>

        {/* Bank Account Selection (when Bank Statement mode is active) */}
        {documentType === 'bank_statement' && (
          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-primary" /> Target Bank Account:
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingAccount(!isCreatingAccount)}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                {isCreatingAccount ? 'Cancel' : '+ New Account'}
              </button>
            </div>

            {isCreatingAccount ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Account Name (e.g. Main Operating)"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="flex-1 p-1.5 bg-muted/40 border border-border rounded text-xs text-foreground"
                />
                <input
                  type="text"
                  placeholder="Bank (e.g. AIB, BOI)"
                  value={newAccountBank}
                  onChange={(e) => setNewAccountBank(e.target.value)}
                  className="w-32 p-1.5 bg-muted/40 border border-border rounded text-xs text-foreground"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!newAccountName) return;
                    const created = await apiService.createBankAccount(activeOrgId, {
                      name: newAccountName,
                      bank_name: newAccountBank || 'Bank',
                    });
                    setBankAccounts((prev) => [created, ...prev]);
                    setSelectedAccountId(created.id);
                    setIsCreatingAccount(false);
                    setNewAccountName('');
                  }}
                >
                  Save
                </Button>
              </div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full p-2 bg-muted/30 border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer"
              >
                {bankAccounts.length === 0 ? (
                  <option value="">No bank accounts available (Click '+ New Account')</option>
                ) : (
                  bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bank_name} — {acc.name} ({acc.currency})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        )}

        {/* Hidden Multi-File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={
            documentType === 'invoice'
              ? '.pdf,.png,.jpg,.jpeg,.tiff,.bmp,.PDF,.PNG,.JPG,.JPEG,.TIFF,.BMP,application/pdf,image/*'
              : '.pdf,.png,.jpg,.jpeg,.tiff,.tif,.webp,.bmp,.csv,.tsv,.txt,.PDF,.PNG,.JPG,.JPEG,.TIFF,.TIF,.WEBP,.BMP,.CSV,.TSV,.TXT,application/pdf,image/*,text/csv,text/tab-separated-values,text/plain'
          }
          multiple
          className="hidden"
        />

        {/* Dropzone */}
        {queue.length === 0 ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary rounded-xl p-8 text-center cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center gap-3"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              {documentType === 'invoice' ? <UploadCloud className="w-7 h-7" /> : <Landmark className="w-7 h-7" />}
            </div>

            <div>
              <p className="font-bold text-foreground text-base">
                Click to upload or drag & drop files
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {documentType === 'invoice'
                  ? 'PDF, PNG, JPG, or TIFF • Select multiple invoices at once (up to 35 MB each)'
                  : 'CSV, PDF, or Image files (PNG, JPG, WebP) • Full LLM transcription & reconciliation'}
              </p>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border border-dashed border-border rounded-lg p-3 text-center transition-colors flex items-center justify-center gap-2 ${
              isUploading
                ? 'opacity-50 cursor-not-allowed bg-muted/10'
                : 'hover:border-primary cursor-pointer bg-muted/20 hover:bg-muted/40'
            }`}
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              Add more files or drag & drop here
            </span>
          </div>
        )}

        {/* File Queue List */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-bold text-foreground">
                Selected Documents ({queue.length} {queue.length === 1 ? 'file' : 'files'} • {formatFileSize(totalBytes)})
              </span>
              {!isUploading && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 rounded-lg border border-border divide-y divide-border/50 bg-muted/15 p-1.5">
              {queue.map((item, idx) => {
                const isCurrent = idx === currentIndex && isUploading;

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-md flex items-center justify-between gap-3 text-xs transition-colors ${
                      isCurrent
                        ? 'bg-primary/10 border border-primary/30'
                        : item.status === 'completed'
                        ? 'bg-emerald-500/5'
                        : item.status === 'failed'
                        ? 'bg-destructive/10'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {getFileIcon(item.file.name)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {getFileTypeBadge(item.file.name)}
                          <p className="font-semibold text-foreground truncate max-w-[260px]">
                            {item.file.name}
                          </p>
                          <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                            ({formatFileSize(item.file.size)})
                          </span>
                        </div>
                        {item.statusMessage && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {item.statusMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'queued' && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                          <Clock className="w-3 h-3" /> Queued
                        </span>
                      )}
                      {item.status === 'quarantined' && (
                        <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-bold">
                          <Shield className="w-3 h-3 animate-pulse" /> Scanning
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                          <Loader2 className="w-3 h-3 animate-spin" /> Extracting
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="flex items-center gap-1 text-[11px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-bold">
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      )}

                      {!isUploading && item.status === 'queued' && (
                        <button
                          type="button"
                          onClick={() => removeFile(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Industry Profile Selection & Injected Rules */}
        {documentType === 'invoice' && (
          <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Cpu className="w-3.5 h-3.5 text-sky-500" />
                <span>Industry Profile (Injected Rules):</span>
              </label>
              <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full">
                Injected on Upload
              </span>
            </div>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value as IndustryCode)}
              disabled={isUploading}
              className="w-full p-2 bg-card border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              {industryPresets.map((p) => (
                <option key={p.industry_code} value={p.industry_code}>
                  {p.display_name}
                </option>
              ))}
            </select>
            <div className="p-2.5 rounded-lg bg-muted/70 border border-border mt-1">
              <p className="text-[11px] text-foreground font-mono leading-relaxed line-clamp-2 font-medium">
                <strong className="text-primary font-semibold">Rules Injected: </strong>
                {industryPresets.find((p) => p.industry_code === selectedIndustry)?.industry_rules}
              </p>
            </div>
          </div>
        )}

        {/* Model Selection */}
        <div>
          <label className="font-bold text-foreground block mb-1.5 flex items-center gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Visual LLM Extractor:
          </label>
          <select
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            disabled={isUploading}
            className="w-full p-2 bg-card border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Visual LLMs inspect raw document geometry, line-item tables, and tax breakdowns across all uploaded documents.
          </p>
        </div>

        {/* Overall Ingestion Progress Indicator */}
        {isUploading && (
          <div className="p-3.5 rounded-xl bg-card border border-border space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between font-bold text-xs">
              <span className="flex items-center gap-1.5 text-primary">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing Batch ({currentIndex + 1} of {queue.length}):
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.round(((currentIndex + 1) / queue.length) * 100)}%
              </span>
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.round(((currentIndex + 1) / queue.length) * 100)}%`,
                }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground truncate">
              {currentIndex >= 0 && queue[currentIndex]
                ? `Currently processing: ${queue[currentIndex].file.name}`
                : 'Initializing extraction batch...'}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
