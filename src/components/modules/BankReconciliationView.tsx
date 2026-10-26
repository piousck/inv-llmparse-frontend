import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Check,
  X,
  Layers,
  ArrowUpDown,
  Inbox,
  FileSpreadsheet,
  FolderKanban,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { apiService } from '../../services/api';
import {
  BankStatementDto,
  BankTransactionDto,
  ReviewQueueItemDto,
  DuplicateQueueItemDto,
} from '../../types/api';
import { formatCurrency } from '../../lib/utils';
import { DocumentSubTab } from '../layout/Sidebar';
import { useDateFormat } from '../../lib/dateUtils';

interface BankReconciliationViewProps {
  activeOrgId?: string;
  refreshKey?: number;
  onOpenUpload?: (initialType?: 'invoice' | 'bank_statement') => void;
  onShowToast: (msg: string) => void;
  onSelectDocumentSubTab?: (subTab: DocumentSubTab) => void;
}

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  activeOrgId,
  refreshKey = 0,
  onOpenUpload,
  onShowToast,
  onSelectDocumentSubTab,
}) => {
  const { formatDate } = useDateFormat();
  const [statements, setStatements] = useState<BankStatementDto[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<BankTransactionDto[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItemDto[]>([]);
  const [duplicateQueue, setDuplicateQueue] = useState<DuplicateQueueItemDto[]>([]);
  const [isLoadingStatements, setIsLoadingStatements] = useState<boolean>(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(false);
  const [isLoadingReview, setIsLoadingReview] = useState<boolean>(false);
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState<boolean>(false);
  const [reviewingAllocId, setReviewingAllocId] = useState<string | null>(null);
  const [reviewingDuplicateId, setReviewingDuplicateId] = useState<string | null>(null);

  // Filter, Search, and Sort states (default earliest first)
  const [activeTab, setActiveTab] = useState<'transactions' | 'review' | 'duplicates'>('transactions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 30;

  const parseDateTimestamp = (dStr: string | null | undefined): number => {
    if (!dStr) return 0;
    const isoMatch = dStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(dStr).getTime();
    }
    let cleaned = dStr.trim().replace(/\bsept\b/i, 'Sep');
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    for (const m of months) {
      const regex = new RegExp(`\\b${m.split('').join('\\s*')}\\b`, 'i');
      cleaned = cleaned.replace(regex, m);
    }
    cleaned = cleaned.replace(/(\b\d)\s+(\d)\s+(\d)\s+(\d)\b/, '$1$2$3$4');
    cleaned = cleaned.replace(/(\b\d)\s+(\d)\b/, '$1$2');
    const ts = new Date(cleaned).getTime();
    return isNaN(ts) ? 0 : ts;
  };

  const formatTxnDate = (dStr: string | null | undefined): string => {
    return formatDate(dStr);
  };

  // 1. Fetch statements on mount or when activeOrgId / refreshKey changes
  useEffect(() => {
    if (!activeOrgId) return;
    loadStatements();
  }, [activeOrgId, refreshKey]);

  const loadStatements = async () => {
    if (!activeOrgId) return;
    setIsLoadingStatements(true);
    try {
      const list = await apiService.listBankStatements(activeOrgId);
      setStatements(list);
      if (list.length > 0) {
        setSelectedStatementId((prev) => {
          if (prev && list.some((s) => s.id === prev)) {
            return prev;
          }
          return list[0].id;
        });
      } else {
        setSelectedStatementId(null);
        setTransactions([]);
      }
    } catch (err) {
      console.error('Failed to load bank statements:', err);
      onShowToast('Could not load bank statements');
    } finally {
      setIsLoadingStatements(false);
    }
  };

  // 2. Fetch transactions & review queue when selected statement changes
  useEffect(() => {
    if (!activeOrgId || !selectedStatementId) {
      setTransactions([]);
      return;
    }
    loadTransactionsAndReview(selectedStatementId);
  }, [activeOrgId, selectedStatementId]);

  const loadTransactionsAndReview = async (statementId: string, order: 'asc' | 'desc' = sortOrder) => {
    if (!activeOrgId) return;
    setIsLoadingTransactions(true);
    setCurrentPage(1);
    try {
      const txs = await apiService.getBankStatementTransactions(activeOrgId, statementId, order);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load statement transactions:', err);
      onShowToast('Could not load transactions');
    } finally {
      setIsLoadingTransactions(false);
    }

    // Load review queue
    setIsLoadingReview(true);
    try {
      const queue = await apiService.getReconciliationReviewQueue(activeOrgId);
      setReviewQueue(queue);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setIsLoadingReview(false);
    }

    // Load duplicate review queue
    setIsLoadingDuplicates(true);
    try {
      const dups = await apiService.getDuplicateReviewQueue(activeOrgId);
      setDuplicateQueue(dups);
    } catch (err) {
      console.error('Failed to load duplicate queue:', err);
    } finally {
      setIsLoadingDuplicates(false);
    }
  };

  // Selected statement object
  const selectedStatement = useMemo(() => {
    return statements.find((s) => s.id === selectedStatementId) || null;
  }, [statements, selectedStatementId]);

  // Handle Review Allocation Action
  const handleReviewAction = async (
    allocationId: string,
    action: 'confirm' | 'reject',
    invoiceId?: string
  ) => {
    if (!activeOrgId) return;
    setReviewingAllocId(allocationId);
    try {
      await apiService.reviewPaymentAllocation(activeOrgId, allocationId, action, invoiceId);
      onShowToast(`Allocation ${action}ed`);
      // Reload review queue
      const queue = await apiService.getReconciliationReviewQueue(activeOrgId);
      setReviewQueue(queue);
    } catch (err: any) {
      console.error('Review action failed:', err);
      onShowToast(err.message || 'Action failed');
    } finally {
      setReviewingAllocId(null);
    }
  };

  // Handle Review Duplicate Action
  const handleDuplicateAction = async (
    transactionId: string,
    action: 'approve' | 'reject'
  ) => {
    if (!activeOrgId) return;
    setReviewingDuplicateId(transactionId);
    try {
      const res = await apiService.reviewDuplicateTransaction(activeOrgId, transactionId, action);
      onShowToast(
        action === 'approve'
          ? `Duplicate approved and imported${res.allocations.length > 0 ? ` (${res.allocations.length} auto-allocated)` : ''}`
          : 'Duplicate transaction rejected'
      );
      // Reload duplicate queue and transactions
      const dups = await apiService.getDuplicateReviewQueue(activeOrgId);
      setDuplicateQueue(dups);
      if (selectedStatementId) {
        const txs = await apiService.getBankStatementTransactions(activeOrgId, selectedStatementId, sortOrder);
        setTransactions(txs);
      }
    } catch (err: any) {
      console.error('Review duplicate failed:', err);
      onShowToast(err.message || 'Action failed');
    } finally {
      setReviewingDuplicateId(null);
    }
  };

  // Calculated totals for selected statement
  const { totalCredits, totalDebits } = useMemo(() => {
    let credits = 0;
    let debits = 0;
    for (const tx of transactions) {
      const amt = Number(tx.amount) || 0;
      if (tx.direction === 'credit') {
        credits += amt;
      } else {
        debits += amt;
      }
    }
    return {
      totalCredits: credits,
      totalDebits: debits,
    };
  }, [transactions]);

  // Discrepancy calculation
  const discrepancy = useMemo(() => {
    if (!selectedStatement) return 0;
    if (selectedStatement.reconciliation_details?.discrepancy !== undefined) {
      return Number(selectedStatement.reconciliation_details.discrepancy);
    }
    const opening = Number(selectedStatement.opening_balance ?? 0);
    const closing = Number(selectedStatement.closing_balance ?? 0);
    if (opening !== 0 || closing !== 0) {
      const calculatedClosing = opening + totalCredits - totalDebits;
      return Math.round(Math.abs(calculatedClosing - closing) * 100) / 100;
    }
    return 0;
  }, [selectedStatement, totalCredits, totalDebits]);

  // Filtered & Sorted transactions (earliest at top by default)
  const filteredTransactions = useMemo(() => {
    let list = transactions;

    if (directionFilter !== 'all') {
      list = list.filter((t) => t.direction === directionFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const partyMatch = (t.counterparty_name || '').toLowerCase().includes(q);
        const refMatch = (t.reference_text || '').toLowerCase().includes(q);
        const dateMatch =
          (t.txn_date || '').toLowerCase().includes(q) ||
          formatTxnDate(t.txn_date).toLowerCase().includes(q);
        const amtMatch = String(t.amount).includes(q);
        return descMatch || partyMatch || refMatch || dateMatch || amtMatch;
      });
    }

    // Sort transactions chronologically (earliest first by default)
    return [...list].sort((a, b) => {
      const tsA = parseDateTimestamp(a.txn_date);
      const tsB = parseDateTimestamp(b.txn_date);
      if (tsA !== tsB) {
        return sortOrder === 'asc' ? tsA - tsB : tsB - tsA;
      }
      return sortOrder === 'asc'
        ? (a.row_index ?? 0) - (b.row_index ?? 0)
        : (b.row_index ?? 0) - (a.row_index ?? 0);
    });
  }, [transactions, directionFilter, searchQuery, sortOrder]);

  // Pagination slice
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;

  const debitsCount = useMemo(
    () => transactions.filter((t) => t.direction === 'debit').length,
    [transactions]
  );
  const creditsCount = useMemo(
    () => transactions.filter((t) => t.direction === 'credit').length,
    [transactions]
  );

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col bg-background gap-6 max-w-[1600px] w-full mx-auto">
      {/* Top Document Category Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-card rounded-xl border border-border shadow-xs shrink-0 overflow-x-auto">
        <button
          onClick={() => onSelectDocumentSubTab?.('purchases')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Purchases</span>
        </button>

        <button
          onClick={() => onSelectDocumentSubTab?.('bank_statements')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap bg-primary text-primary-foreground shadow-xs font-bold"
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Bank Statements</span>
        </button>

        <button
          onClick={() => onSelectDocumentSubTab?.('supplier_statements')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Supplier Statements</span>
        </button>

        <button
          onClick={() => onSelectDocumentSubTab?.('other_documents')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Other Documents</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
              Bank Statement Reconciliation
            </h1>
            <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
              LLM OCR & Ledger
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Automated statement OCR transcription, deterministic balance reconciliation, and supplier invoice payment matching.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStatements}
            disabled={isLoadingStatements}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatements ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {onOpenUpload && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenUpload('bank_statement')}
              className="h-8 text-xs font-bold gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Bank Statement
            </Button>
          )}
        </div>
      </div>

      {/* Main Layout: Left Statements List | Right Transactions & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-6 items-start">
        {/* Left Column: Statements List & Quick Drop */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary" />
                Uploaded Statements ({statements.length})
              </CardTitle>
              {onOpenUpload && (
                <button
                  onClick={() => onOpenUpload('bank_statement')}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  + Upload
                </button>
              )}
            </CardHeader>
            <CardBody className="p-3 space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto">
              {isLoadingStatements && statements.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Loading statements...</span>
                </div>
              ) : statements.length === 0 ? (
                <div className="py-10 px-4 text-center border-2 border-dashed border-border rounded-xl bg-muted/20 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-foreground text-xs">No Statements Uploaded</p>
                  <p className="text-[11px] text-muted-foreground">
                    Upload a PDF or image statement to extract transactions.
                  </p>
                  {onOpenUpload && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onOpenUpload('bank_statement')}
                      className="mt-2 h-7 text-xs"
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload Statement
                    </Button>
                  )}
                </div>
              ) : (
                statements.map((stmt) => {
                  const isSelected = stmt.id === selectedStatementId;
                  const isReconciled = stmt.status === 'reconciled';
                  const isFailed = stmt.status === 'reconcile_failed';
                  const stmtDiscrepancy = stmt.reconciliation_details?.discrepancy ?? 0;

                  return (
                    <div
                      key={stmt.id}
                      onClick={() => setSelectedStatementId(stmt.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40'
                          : 'border-border bg-card hover:bg-muted/30 hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate" title={stmt.source_filename}>
                            {stmt.source_filename}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {stmt.period_start && stmt.period_end
                              ? `${formatTxnDate(stmt.period_start)} – ${formatTxnDate(stmt.period_end)}`
                              : `Uploaded ${new Date(stmt.uploaded_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        {isReconciled ? (
                          <Badge variant="success" className="text-[9px] px-1.5 py-0 shrink-0 gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Balanced
                          </Badge>
                        ) : isFailed ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0 gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Discrepancy
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0 gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {stmt.status}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-muted-foreground">
                          {stmt.transaction_count} txns
                        </span>
                        {stmt.closing_balance !== null && stmt.closing_balance !== undefined && (
                          <span className="font-mono font-semibold text-foreground">
                            Close: {formatCurrency(stmt.closing_balance)}
                          </span>
                        )}
                      </div>

                      {stmtDiscrepancy > 0.01 && (
                        <div className="mt-1 text-[10px] text-amber-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Diff: {formatCurrency(stmtDiscrepancy)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Statement Dashboard & Transactions */}
        <div className="flex flex-col gap-5 min-w-0">
          {selectedStatement ? (
            <>
              {/* Statement KPI Balance Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Opening Balance */}
                <Card className="bg-card shadow-xs">
                  <CardBody className="p-3.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Opening Balance
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-foreground mt-0.5 block truncate">
                      {formatCurrency(selectedStatement.opening_balance)}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                      {selectedStatement.period_start || 'Start of period'}
                    </span>
                  </CardBody>
                </Card>

                {/* Total Money In / Credits */}
                <Card className="bg-card shadow-xs">
                  <CardBody className="p-3.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider flex items-center gap-1">
                      <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                      Money In (Credits)
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-600 mt-0.5 block truncate">
                      +{formatCurrency(totalCredits)}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      {creditsCount} incoming txns
                    </span>
                  </CardBody>
                </Card>

                {/* Total Money Out / Debits */}
                <Card className="bg-card shadow-xs">
                  <CardBody className="p-3.5">
                    <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-rose-600" />
                      Money Out (Debits)
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-rose-600 mt-0.5 block truncate">
                      -{formatCurrency(totalDebits)}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      {debitsCount} outgoing txns
                    </span>
                  </CardBody>
                </Card>

                {/* Closing Balance */}
                <Card className="bg-card shadow-xs">
                  <CardBody className="p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Closing Balance
                      </span>
                      {Math.abs(discrepancy) < 0.01 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Balanced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-2.5 h-2.5" /> Diff {formatCurrency(discrepancy)}
                        </span>
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-black font-mono text-foreground mt-0.5 block truncate">
                      {formatCurrency(selectedStatement.closing_balance)}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                      {selectedStatement.period_end || 'End of period'}
                    </span>
                  </CardBody>
                </Card>
              </div>

              {/* Transactions / Review Tabs and Table */}
              <Card className="shadow-xs overflow-hidden">
                <CardHeader className="py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border bg-card">
                  {/* Tabs */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                        activeTab === 'transactions'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Extracted Transactions ({filteredTransactions.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('review')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                        activeTab === 'review'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Matching Review Queue ({reviewQueue.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('duplicates')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                        activeTab === 'duplicates'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Duplicate Review ({duplicateQueue.length})
                      {duplicateQueue.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-amber-950 font-bold text-[10px]">
                          {duplicateQueue.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Statement metadata */}
                  <span className="text-[11px] text-muted-foreground font-mono truncate">
                    {selectedStatement.source_filename}
                  </span>
                </CardHeader>

                {activeTab === 'transactions' ? (
                  <>
                    {/* Filters Toolbar */}
                    <div className="p-3 border-b border-border bg-muted/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      {/* Search */}
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          placeholder="Search description, payee, ref, date, or amount..."
                          className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {/* Controls: Direction Filter Pills & Sort Toggle */}
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                          <button
                            onClick={() => {
                              setDirectionFilter('all');
                              setCurrentPage(1);
                            }}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-colors ${
                              directionFilter === 'all'
                                ? 'bg-card text-foreground shadow-xs font-bold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            All ({transactions.length})
                          </button>
                          <button
                            onClick={() => {
                              setDirectionFilter('debit');
                              setCurrentPage(1);
                            }}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                              directionFilter === 'debit'
                                ? 'bg-rose-500/10 text-rose-600 shadow-xs font-bold'
                                : 'text-muted-foreground hover:text-rose-600'
                            }`}
                          >
                            Money Out ({debitsCount})
                          </button>
                          <button
                            onClick={() => {
                              setDirectionFilter('credit');
                              setCurrentPage(1);
                            }}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                              directionFilter === 'credit'
                                ? 'bg-emerald-500/10 text-emerald-600 shadow-xs font-bold'
                                : 'text-muted-foreground hover:text-emerald-600'
                            }`}
                          >
                            Money In ({creditsCount})
                          </button>
                        </div>

                        {/* Sort Order Toggle */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                            setCurrentPage(1);
                          }}
                          className="h-8 text-xs gap-1.5 shrink-0 font-medium border-border"
                          title={
                            sortOrder === 'asc'
                              ? 'Currently showing earliest transactions at top'
                              : 'Currently showing latest transactions at top'
                          }
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{sortOrder === 'asc' ? 'Earliest First' : 'Latest First'}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-muted/30 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            <th className="px-3 py-2.5 w-12 text-center">#</th>
                            <th className="px-3 py-2.5 w-28">Date</th>
                            <th className="px-4 py-2.5">Description / Payee</th>
                            <th className="px-3 py-2.5 w-28">Reference</th>
                            <th className="px-4 py-2.5 text-right w-36">Amount</th>
                            <th className="px-4 py-2.5 text-right w-36">Running Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {isLoadingTransactions ? (
                            <tr>
                              <td colSpan={6} className="py-16 text-center text-muted-foreground">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                                <span>Loading extracted transactions...</span>
                              </td>
                            </tr>
                          ) : paginatedTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                <p className="font-semibold text-xs text-foreground">No transactions found</p>
                                <p className="text-[11px] mt-0.5">
                                  {searchQuery || directionFilter !== 'all'
                                    ? 'Try changing your search keywords or direction filter.'
                                    : 'No transaction rows extracted for this statement.'}
                                </p>
                              </td>
                            </tr>
                          ) : (
                            paginatedTransactions.map((tx, idx) => {
                              const isDebit = tx.direction === 'debit';
                              const amt = Number(tx.amount) || 0;
                              const runningBal =
                                tx.running_balance !== null && tx.running_balance !== undefined
                                  ? Number(tx.running_balance)
                                  : null;

                              // Split description lines if multiline (e.g. FX rate / fee)
                              const descLines = (tx.description || '').split('\n');
                              const mainDesc = descLines[0];
                              const subDesc = descLines.slice(1).join(' • ');

                              const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                              return (
                                <tr key={tx.id || idx} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-3 py-2.5 text-center font-mono text-[10px] text-muted-foreground">
                                    {rowNumber}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                    {formatTxnDate(tx.txn_date)}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex flex-col">
                                      {tx.counterparty_name && (
                                        <span className="font-bold text-foreground text-xs">
                                          {tx.counterparty_name}
                                        </span>
                                      )}
                                      <span
                                        className={`${
                                          tx.counterparty_name
                                            ? 'text-[11px] text-muted-foreground'
                                            : 'font-semibold text-foreground text-xs'
                                        }`}
                                      >
                                        {mainDesc}
                                      </span>
                                      {subDesc && (
                                        <span className="text-[10px] text-primary/80 font-mono mt-0.5">
                                          {subDesc}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                                    {tx.reference_text || '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold whitespace-nowrap">
                                    {isDebit ? (
                                      <span className="text-rose-600">-{formatCurrency(amt)}</span>
                                    ) : (
                                      <span className="text-emerald-600">+{formatCurrency(amt)}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                    {runningBal !== null ? formatCurrency(runningBal) : '—'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {filteredTransactions.length > pageSize && (
                      <div className="py-2.5 px-4 border-t border-border bg-card flex items-center justify-between text-xs">
                        <span className="text-muted-foreground text-[11px]">
                          Showing {(currentPage - 1) * pageSize + 1} to{' '}
                          {Math.min(currentPage * pageSize, filteredTransactions.length)} of{' '}
                          {filteredTransactions.length} transactions
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-7 text-xs px-2"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                            Prev
                          </Button>
                          <span className="text-xs font-mono font-bold px-2">
                            {currentPage} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-7 text-xs px-2"
                          >
                            Next
                            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : activeTab === 'review' ? (
                  /* Matching Review Queue Tab */
                  <div className="p-4 space-y-3">
                    {isLoadingReview ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                        <span className="text-xs">Loading review queue...</span>
                      </div>
                    ) : reviewQueue.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed border-border rounded-xl">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-foreground">Review Queue is Clear</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          All statement payments have either been auto-allocated or verified.
                        </p>
                      </div>
                    ) : (
                      reviewQueue.map((item) => {
                        const tx = item.transaction;
                        const isReviewing = reviewingAllocId === item.current_allocation?.id;

                        return (
                          <div
                            key={tx.id}
                            className="p-3.5 rounded-lg border border-border bg-card space-y-2.5 text-xs shadow-xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2">
                              <div>
                                <span className="font-bold text-foreground text-xs">
                                  {tx.counterparty_name || tx.description}
                                </span>
                                <span className="text-[11px] text-muted-foreground ml-2 font-mono">
                                  {formatTxnDate(tx.txn_date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-rose-600">
                                  -{formatCurrency(tx.amount)}
                                </span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {item.current_allocation?.status || 'unmatched'}
                                </Badge>
                              </div>
                            </div>

                            {/* Candidate Invoices */}
                            {item.candidates && item.candidates.length > 0 ? (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                  Suggested Invoice Matches:
                                </span>
                                {item.candidates.map((cand) => (
                                  <div
                                    key={cand.invoice_id}
                                    className="p-2 rounded bg-muted/20 border border-border flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="min-w-0">
                                      <p className="font-bold text-foreground text-xs">
                                        {cand.invoice_number || 'INV'} • {cand.supplier_name}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        Due: {formatCurrency(cand.balance_remaining)} | Confidence:{' '}
                                        {Math.round(Number(cand.confidence_score) * 100)}% ({cand.match_method})
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {item.current_allocation && (
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          disabled={isReviewing}
                                          onClick={() =>
                                            handleReviewAction(
                                              item.current_allocation!.id,
                                              'confirm',
                                              cand.invoice_id
                                            )
                                          }
                                          className="h-7 text-[11px] px-2"
                                        >
                                          <Check className="w-3 h-3 mr-1" />
                                          Match
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[11px] text-muted-foreground italic py-1">
                                No open purchase invoices found matching amount {formatCurrency(tx.amount)}.
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  /* Duplicate Transactions Review Tab */
                  <div className="p-4 space-y-3">
                    {isLoadingDuplicates ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                        <span className="text-xs">Loading duplicate transactions queue...</span>
                      </div>
                    ) : duplicateQueue.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed border-border rounded-xl">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-foreground">No Duplicate Transactions</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          All imported bank transactions are clean and free of duplicates.
                        </p>
                      </div>
                    ) : (
                      duplicateQueue.map((item) => {
                        const tx = item.transaction;
                        const orig = item.duplicate_of;
                        const isReviewing = reviewingDuplicateId === tx.id;

                        return (
                          <div
                            key={tx.id}
                            className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3 text-xs shadow-xs"
                          >
                            {/* Duplicate Item Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 text-[10px] font-bold">
                                  <AlertTriangle className="w-3 h-3 text-amber-600 mr-1" />
                                  Duplicate Warning
                                </Badge>
                                <span className="font-bold text-foreground text-sm">
                                  {tx.counterparty_name || tx.description}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {formatTxnDate(tx.txn_date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`font-mono font-bold text-sm ${
                                    tx.direction === 'credit'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600'
                                  }`}
                                >
                                  {tx.direction === 'credit' ? '+' : '-'}
                                  {formatCurrency(tx.amount)}
                                </span>
                              </div>
                            </div>

                            {/* Reason Notice */}
                            {item.reason && (
                              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
                                <strong>Reason:</strong> {item.reason}
                              </div>
                            )}

                            {/* Comparison Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              {/* Left: Incoming Duplicate Candidate */}
                              <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                  Incoming Transaction (Held for Review)
                                </span>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-mono font-medium">{formatTxnDate(tx.txn_date)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-mono font-bold">
                                      {tx.direction === 'credit' ? '+' : '-'}
                                      {formatCurrency(tx.amount)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Description:</span>
                                    <span className="font-medium truncate max-w-[200px]" title={tx.description}>
                                      {tx.description}
                                    </span>
                                  </div>
                                  {tx.reference_text && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Reference:</span>
                                      <span className="font-mono text-[11px] truncate max-w-[200px]">
                                        {tx.reference_text}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right: Existing Transaction on Record */}
                              <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                  Existing Transaction in System
                                </span>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Statement File:</span>
                                    <span className="font-mono font-medium truncate max-w-[200px]" title={item.duplicate_of_statement_filename || 'Earlier Statement'}>
                                      {item.duplicate_of_statement_filename || 'Earlier Statement'}
                                    </span>
                                  </div>
                                  {orig ? (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Date:</span>
                                        <span className="font-mono font-medium">{formatTxnDate(orig.txn_date)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Amount:</span>
                                        <span className="font-mono font-bold">
                                          {orig.direction === 'credit' ? '+' : '-'}
                                          {formatCurrency(orig.amount)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Description:</span>
                                        <span className="font-medium truncate max-w-[200px]" title={orig.description}>
                                          {orig.description}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-[11px] text-muted-foreground italic py-1">
                                      Identical transaction previously imported.
                                    </div>
                                  )}
                                  {item.duplicate_of_allocated_invoice && (
                                    <div className="flex justify-between items-center pt-1 border-t border-border/50">
                                      <span className="text-muted-foreground">Matched Invoice:</span>
                                      <Badge variant="outline" className="text-[10px] font-mono">
                                        {item.duplicate_of_allocated_invoice}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions Toolbar */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isReviewing}
                                onClick={() => handleDuplicateAction(tx.id, 'reject')}
                                className="h-8 text-xs px-3 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                              >
                                {isReviewing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                ) : (
                                  <X className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Reject Duplicate (Exclude)
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={isReviewing}
                                onClick={() => handleDuplicateAction(tx.id, 'approve')}
                                className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {isReviewing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Approve Import (Allow Duplicate)
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="py-16 text-center border-2 border-dashed border-border bg-muted/10">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Landmark className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-foreground">Select or Upload a Bank Statement</h3>
                <p className="text-xs text-muted-foreground">
                  Choose an uploaded statement from the left sidebar to inspect its extracted transactions and balance reconciliation, or upload a new one.
                </p>
                {onOpenUpload && (
                  <Button variant="primary" size="sm" onClick={() => onOpenUpload('bank_statement')} className="mt-2 text-xs">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload Statement
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

