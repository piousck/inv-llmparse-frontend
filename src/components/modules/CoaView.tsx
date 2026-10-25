import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { apiService } from '../../services/api';
import { OrganizationGLAccount, OrganizationGLAccountCreate } from '../../types/api';

interface CoaViewProps {
  embedded?: boolean;
  orgId?: string;
  industry?: string;
}

export const CoaView: React.FC<CoaViewProps> = ({ embedded = false, orgId, industry }) => {
  const [accounts, setAccounts] = useState<OrganizationGLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeOrgId, setActiveOrgId] = useState<string>(orgId || '');
  const [activeOrgIndustry, setActiveOrgIndustry] = useState<string>(industry || '');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<OrganizationGLAccount | null>(null);
  const [formData, setFormData] = useState<OrganizationGLAccountCreate>({
    code: '',
    name: '',
    category: 'Operating Expense',
    default_tax_rate: 'T23',
    description: '',
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const targetOrgId = orgId || apiService.getActiveOrgId();
    setActiveOrgId(targetOrgId);
    if (industry) {
      setActiveOrgIndustry(industry);
    } else {
      apiService.getOrganizations().then((orgs) => {
        const matching = orgs.find((o) => o.id === targetOrgId);
        if (matching?.industry) {
          setActiveOrgIndustry(matching.industry);
        }
      }).catch(() => {});
    }
    if (targetOrgId) {
      loadAccounts(targetOrgId);
    }
  }, [orgId, industry]);

  const loadAccounts = async (orgId: string) => {
    setLoading(true);
    try {
      const data = await apiService.getOrganizationGLAccounts(orgId);
      setAccounts(data);
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormData({
      code: '',
      name: '',
      category: 'Operating Expense',
      default_tax_rate: 'T23',
      description: '',
      is_active: true,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: OrganizationGLAccount) => {
    setEditingAccount(acc);
    setFormData({
      code: acc.code,
      name: acc.name,
      category: acc.category,
      default_tax_rate: acc.default_tax_rate || '',
      description: acc.description || '',
      is_active: acc.is_active,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      setErrorMessage('GL Code and Account Name are required');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (editingAccount) {
        const updated = await apiService.updateOrganizationGLAccount(
          activeOrgId,
          editingAccount.id,
          formData
        );
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const created = await apiService.createOrganizationGLAccount(activeOrgId, formData);
        setAccounts((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (acc: OrganizationGLAccount) => {
    try {
      const updated = await apiService.updateOrganizationGLAccount(activeOrgId, acc.id, {
        is_active: !acc.is_active,
      });
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err: any) {
      console.error('Failed to toggle active status:', err);
    }
  };

  const handleDelete = async (acc: OrganizationGLAccount) => {
    if (!window.confirm(`Are you sure you want to delete GL code '${acc.code} - ${acc.name}'?`)) {
      return;
    }
    try {
      await apiService.deleteOrganizationGLAccount(activeOrgId, acc.id);
      setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
    } catch (err: any) {
      alert(`Failed to delete account: ${err.message}`);
    }
  };

  const handleResetToXero = async () => {
    const profileLabel = activeOrgIndustry ? `${activeOrgIndustry.replace('_', ' ')} industry profile` : 'standard defaults';
    if (
      !window.confirm(
        `Reset this organization's Chart of Accounts to ${profileLabel}? All 8 Trial Balance sections (Revenue, Direct Costs, Operating Overheads, Current Assets, Fixed Assets, Current Liabilities, Non-Current Liabilities, Equity) will be seeded with standard accounts.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const data = await apiService.seedOrganizationGLAccounts(activeOrgId, true, activeOrgIndustry);
      setAccounts(data);
    } catch (err: any) {
      alert(`Failed to reset accounts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  const categories = Array.from(new Set(accounts.map((a) => a.category))).filter(Boolean);
  const filteredAccounts = accounts.filter((acc) => {
    if (categoryFilter !== 'ALL' && acc.category !== categoryFilter) {
      return false;
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchesCode = acc.code.toLowerCase().includes(term);
      const matchesName = acc.name.toLowerCase().includes(term);
      const matchesDesc = (acc.description || '').toLowerCase().includes(term);
      return matchesCode || matchesName || matchesDesc;
    }
    return true;
  });

  const activeCount = accounts.filter((a) => a.is_active).length;

  return (
    <div className={embedded ? "flex flex-col gap-4" : "flex-1 p-6 md:p-8 flex flex-col bg-background gap-6"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={embedded ? "text-base md:text-lg font-black tracking-tight text-foreground flex items-center gap-2" : "text-xl md:text-2xl font-black tracking-tight text-foreground flex items-center gap-2"}>
            <BookOpen className={embedded ? "w-5 h-5 text-primary" : "w-6 h-6 text-primary"} />
            Chart of Accounts (GL Mapping)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Organization-specific general ledger codes injected into the visual LLM prompt for expense classification and Irish VAT reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToXero}
            className="text-xs text-muted-foreground hover:text-danger hover:border-danger"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset to Xero Defaults
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="text-xs font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> Add GL Account
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm font-bold">Chart of Accounts</CardTitle>
            <Badge variant="outline" className="font-mono text-[11px]">
              {activeCount} / {accounts.length} Active
            </Badge>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, name, or note..."
                className="pl-8 pr-3 py-1.5 text-xs bg-muted/30 border border-border rounded-md w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-muted/30 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        {/* Accounts Table */}
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <th className="px-4 py-3 w-24">GL Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center w-28">Default VAT</th>
                <th className="px-4 py-3">Statutory Notes / Rules</th>
                <th className="px-4 py-3 text-center w-24">Status</th>
                <th className="px-4 py-3 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading Chart of Accounts…
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No matching GL accounts found.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      !acc.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-primary">{acc.code}</td>
                    <td className="px-4 py-3 font-bold text-foreground">{acc.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                        {acc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-semibold">
                      {acc.default_tax_rate ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                          {acc.default_tax_rate}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[11px]">
                      {acc.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(acc)}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${
                          acc.is_active
                            ? 'text-emerald-500 hover:text-emerald-600 bg-emerald-500/10'
                            : 'text-muted-foreground hover:text-foreground bg-muted'
                        }`}
                        title={acc.is_active ? 'Click to disable' : 'Click to enable'}
                      >
                        {acc.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(acc)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Edit Account"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc)}
                          className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? `Edit GL Account (${editingAccount.code})` : 'Add GL Account'}
        subtitle="Manage general ledger account settings injected into the extraction model."
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errorMessage && (
            <div className="p-2.5 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                GL Code <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. 300, 413, 500"
                className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Default VAT Code
              </label>
              <input
                type="text"
                value={formData.default_tax_rate || ''}
                onChange={(e) => setFormData({ ...formData, default_tax_rate: e.target.value })}
                placeholder="e.g. T23, T135, TN, TE, T0"
                className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Account Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Purchases (Stock / Resale)"
              className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Category <span className="text-danger">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Revenue">Revenue</option>
              <option value="Direct Costs">Direct Costs</option>
              <option value="Operating Expense">Operating Expense</option>
              <option value="Current Asset">Current Asset</option>
              <option value="Fixed Assets">Fixed Assets</option>
              <option value="Current Liability">Current Liability</option>
              <option value="Non-Current Liability">Non-Current Liability</option>
              <option value="Equity">Equity</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Statutory Notes / Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Section 60(2) stock-in-trade resale exception (100% claimable)"
              rows={3}
              className="w-full px-3 py-2 text-xs bg-muted/40 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_check"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="is_active_check" className="text-xs text-foreground cursor-pointer">
              Active (injected into the LLM system prompt)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
