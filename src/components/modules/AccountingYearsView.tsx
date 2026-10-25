import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  Edit2,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  CalendarCheck2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AccountingYear } from '../../types/api';
import { apiService } from '../../services/api';

interface AccountingYearsViewProps {
  orgId: string;
  orgName: string;
  isAdmin: boolean;
  onShowToast: (msg: string) => void;
}

export const AccountingYearsView: React.FC<AccountingYearsViewProps> = ({
  orgId,
  orgName,
  isAdmin,
  onShowToast,
}) => {
  const [years, setYears] = useState<AccountingYear[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [addName, setAddName] = useState<string>('');
  const [addStartDate, setAddStartDate] = useState<string>('');
  const [addEndDate, setAddEndDate] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Edit / Cutoff Adjustment Modal State
  const [editingYear, setEditingYear] = useState<AccountingYear | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Year End Closing Confirmation State
  const [closingYear, setClosingYear] = useState<AccountingYear | null>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  // Reopening Confirmation State
  const [reopeningYear, setReopeningYear] = useState<AccountingYear | null>(null);
  const [isReopening, setIsReopening] = useState<boolean>(false);

  // Deletion State
  const [deletingYear, setDeletingYear] = useState<AccountingYear | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadYears = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAccountingYears(orgId);
      setYears(data);
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to load accounting years');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, [orgId]);

  const handleOpenAdd = () => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    setAddName(`FY ${nextYear}`);
    setAddStartDate(`${nextYear}-01-01`);
    setAddEndDate(`${nextYear}-12-31`);
    setIsAddOpen(true);
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addStartDate || !addEndDate) {
      onShowToast('Please specify a name and valid start & end dates');
      return;
    }
    if (addStartDate > addEndDate) {
      onShowToast('Start date cannot be after end date');
      return;
    }

    setIsAdding(true);
    try {
      await apiService.createAccountingYear(orgId, {
        name: addName.trim(),
        start_date: addStartDate,
        end_date: addEndDate,
      });
      onShowToast(`Accounting year '${addName}' created.`);
      setIsAddOpen(false);
      await loadYears();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to create accounting year');
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEdit = (year: AccountingYear) => {
    setEditingYear(year);
    setEditName(year.name);
    setEditStartDate(year.start_date);
    setEditEndDate(year.end_date);
  };

  const handleSaveCutoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYear) return;
    if (!editName.trim() || !editStartDate || !editEndDate) {
      onShowToast('Please fill in all date fields');
      return;
    }
    if (editStartDate > editEndDate) {
      onShowToast('Start date cannot be after end date');
      return;
    }

    setIsUpdating(true);
    try {
      await apiService.updateAccountingYear(orgId, editingYear.id, {
        name: editName.trim(),
        start_date: editStartDate,
        end_date: editEndDate,
      });
      onShowToast(`Cutoff updated for '${editName}'. Data boundaries adjusted accordingly.`);
      setEditingYear(null);
      await loadYears();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to update year end cutoff');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseYear = async () => {
    if (!closingYear) return;
    setIsClosing(true);
    try {
      await apiService.closeAccountingYear(orgId, closingYear.id);
      onShowToast(`Completed Year End for '${closingYear.name}'. Period is now locked.`);
      setClosingYear(null);
      await loadYears();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to close accounting year');
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopenYear = async () => {
    if (!reopeningYear) return;
    setIsReopening(true);
    try {
      await apiService.reopenAccountingYear(orgId, reopeningYear.id);
      onShowToast(`Accounting year '${reopeningYear.name}' reopened. Documents unlocked.`);
      setReopeningYear(null);
      await loadYears();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to reopen accounting year');
    } finally {
      setIsReopening(false);
    }
  };

  const handleDeleteYear = async () => {
    if (!deletingYear) return;
    setIsDeleting(true);
    try {
      await apiService.deleteAccountingYear(orgId, deletingYear.id);
      onShowToast(`Accounting year '${deletingYear.name}' deleted.`);
      setDeletingYear(null);
      await loadYears();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to delete accounting year');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-primary" />
              <span>Accounting Years &amp; Period Locking</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage financial years, close year-ends, and adjust date cutoffs to lock books for <strong>{orgName}</strong>.
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenAdd}
              className="gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-primary" /> Add Financial Year
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4 text-xs">
        <div className="p-3 bg-muted/30 border border-border rounded-xl flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 text-muted-foreground text-[11px] leading-relaxed">
            <p>
              <strong className="text-foreground">Year-End Closing Rule:</strong> Closing an accounting year locks all invoices, line items, and bank transactions dated on or before that year-end date. Modifications, deletions, re-OCR, and approvals are prohibited to protect audited accounts.
            </p>
            <p>
              <strong className="text-foreground">Admin Cutoff Adjustment:</strong> Administrators can adjust the year-end date anytime. All data automatically shifts according to the new cutoff.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading accounting periods...</span>
          </div>
        ) : years.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
            <Calendar className="w-8 h-8 opacity-40 mx-auto mb-2" />
            <p className="font-semibold text-foreground">No Accounting Years Configured</p>
            <p className="text-[11px] mt-0.5">Set up your first financial year to enable year-end closing controls.</p>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAdd}
                className="mt-3 gap-1.5 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Set Up Accounting Year
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Financial Year</th>
                  <th className="py-2.5 px-3">Date Range (Cutoff)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Closed Details</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {years.map((year) => (
                  <tr
                    key={year.id}
                    className={`transition-colors ${year.is_closed ? 'bg-amber-500/5' : 'hover:bg-muted/20'}`}
                  >
                    <td className="py-3 px-3 font-bold font-mono text-foreground flex items-center gap-2">
                      {year.is_closed ? (
                        <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span>{year.name}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                      <span>{year.start_date}</span>
                      <span className="mx-1.5 text-muted-foreground/60">→</span>
                      <span className="font-bold text-foreground">{year.end_date}</span>
                    </td>
                    <td className="py-3 px-3">
                      {year.is_closed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                          <Lock className="w-3 h-3" /> Closed &amp; Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" /> Open / Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-muted-foreground">
                      {year.is_closed ? (
                        <div className="leading-tight">
                          <span className="block text-foreground font-medium">
                            {year.closed_at ? new Date(year.closed_at).toLocaleDateString() : 'Yes'}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[150px] block">
                            by {year.closed_by || 'Admin'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Admin Cutoff & Date Adjustment */}
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(year)}
                            title="Adjust Year End Cutoff / Dates"
                            className="h-7 px-2 text-[11px] font-semibold gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Cutoff</span>
                          </Button>
                        )}

                        {/* Complete Year End or Reopen */}
                        {!year.is_closed ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setClosingYear(year)}
                            className="h-7 px-2.5 text-[11px] font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Close Year End</span>
                          </Button>
                        ) : (
                          isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReopeningYear(year)}
                              className="h-7 px-2.5 text-[11px] font-bold gap-1 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
                            >
                              <Unlock className="w-3 h-3 text-amber-600" />
                              <span>Reopen</span>
                            </Button>
                          )
                        )}

                        {/* Delete (only if open) */}
                        {!year.is_closed && isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingYear(year)}
                            title="Delete Year"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>

      {/* Add Financial Year Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => !isAdding && setIsAddOpen(false)}
        title="Add Financial Year"
        subtitle={`Set up a new accounting period for ${orgName}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateYear} className="space-y-4 p-4 text-xs">
          <div>
            <label className="font-bold text-foreground block mb-1">Financial Year Name</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. FY 2025 or 2024/2025"
              required
              className="w-full p-2 bg-background border border-border rounded-lg text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-foreground block mb-1">Period Start Date</label>
              <input
                type="date"
                value={addStartDate}
                onChange={(e) => setAddStartDate(e.target.value)}
                required
                className="w-full p-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="font-bold text-foreground block mb-1">Year End Cutoff Date</label>
              <input
                type="date"
                value={addEndDate}
                onChange={(e) => setAddEndDate(e.target.value)}
                required
                className="w-full p-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-xl border border-border text-[11px] text-muted-foreground space-y-1">
            <span className="font-bold text-foreground block">Period Scope Note</span>
            <p>
              Documents with invoice date falling between these dates will belong to this financial period. You can close this accounting year once year-end auditing is complete.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isAdding}
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isAdding}
              className="gap-1 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAdding ? 'Creating...' : 'Create Year'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Year End / Cutoff Adjustment Modal (Admin Feature) */}
      <Modal
        isOpen={editingYear !== null}
        onClose={() => !isUpdating && setEditingYear(null)}
        title="Adjust Year End & Period Cutoff"
        subtitle={`Administrator Cutoff Control for ${editingYear?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveCutoff} className="space-y-4 p-4 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold">Dynamic Cutoff Adjustment:</strong>
              <span>
                Changing the year-end date will immediately shift the period boundary. Any invoices, line items, and bank transactions dated after the new cutoff date will be automatically excluded from this year and freed for editing.
              </span>
            </div>
          </div>

          <div>
            <label className="font-bold text-foreground block mb-1">Financial Year Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full p-2 bg-background border border-border rounded-lg text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-foreground block mb-1">Period Start Date</label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                required
                className="w-full p-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="font-bold text-foreground block mb-1">New Year End Cutoff Date</label>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                required
                className="w-full p-2 bg-background border border-border rounded-lg text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => setEditingYear(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUpdating}
              className="gap-1 font-bold"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {isUpdating ? 'Applying Cutoff...' : 'Save & Adjust Cutoff'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Year End Confirmation Modal */}
      <Modal
        isOpen={closingYear !== null}
        onClose={() => !isClosing && setClosingYear(null)}
        title="Complete Year End & Lock Period"
        subtitle={`Locking ${closingYear?.name}`}
        maxWidth="md"
      >
        <div className="space-y-4 p-4 text-xs">
          <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-start gap-3">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block text-sm font-bold">Locking Financial Period: {closingYear?.name}</strong>
              <p className="text-[11px] leading-relaxed">
                Closing this accounting year will lock all invoices, credit notes, line items, and bank transaction allocations dated between{' '}
                <span className="font-mono font-bold">{closingYear?.start_date}</span> and{' '}
                <span className="font-mono font-bold">{closingYear?.end_date}</span>.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-[11px] text-muted-foreground pl-1">
            <p className="font-semibold text-foreground">Once locked:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Line items and GL codes cannot be edited or recalculated.</li>
              <li>Re-running OCR or section extraction will be disabled.</li>
              <li>Invoices in this period cannot be deleted or unapproved.</li>
              <li>Only an authorized administrator can reopen the accounting year.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isClosing}
              onClick={() => setClosingYear(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isClosing}
              onClick={handleCloseYear}
              className="gap-1 font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Lock className="w-3.5 h-3.5" />
              {isClosing ? 'Closing & Locking...' : 'Confirm & Lock Year End'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reopen Year Confirmation Modal */}
      <Modal
        isOpen={reopeningYear !== null}
        onClose={() => !isReopening && setReopeningYear(null)}
        title="Reopen Accounting Year"
        subtitle={`Administrator override for ${reopeningYear?.name}`}
        maxWidth="md"
      >
        <div className="space-y-4 p-4 text-xs">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
            <Unlock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block text-sm font-bold">Reopen {reopeningYear?.name}?</strong>
              <p className="text-[11px] leading-relaxed">
                Reopening this accounting year will unlock all documents dated between{' '}
                <span className="font-mono font-bold">{reopeningYear?.start_date}</span> and{' '}
                <span className="font-mono font-bold">{reopeningYear?.end_date}</span>, permitting modifications and corrections once again.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isReopening}
              onClick={() => setReopeningYear(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isReopening}
              onClick={handleReopenYear}
              className="gap-1 font-bold"
            >
              <Unlock className="w-3.5 h-3.5" />
              {isReopening ? 'Reopening...' : 'Confirm Reopen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingYear !== null}
        onClose={() => !isDeleting && setDeletingYear(null)}
        title="Delete Financial Year"
        subtitle={`Remove ${deletingYear?.name}`}
        maxWidth="sm"
      >
        <div className="space-y-4 p-4 text-xs">
          <p className="text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{deletingYear?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeletingYear(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteYear}
              className="gap-1 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Deleting...' : 'Delete Year'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};
