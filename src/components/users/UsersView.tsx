import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Briefcase,
  Lock,
  RefreshCw,
  Key,
  Check,
  Search,
} from 'lucide-react';
import { User, Role, Organization } from '../../types/api';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { generateSecurePassword } from '../../lib/utils';

interface UsersViewProps {
  currentUser: User | null;
  organizations: Organization[];
  onShowToast: (msg: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  currentUser,
  organizations,
  onShowToast,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New User Form State
  const [newEmail, setNewEmail] = useState<string>('');
  const [newDisplayName, setNewDisplayName] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>(() => generateSecurePassword());
  const [newOrgId, setNewOrgId] = useState<string>(() => organizations[0]?.id || '');
  const [newRole, setNewRole] = useState<Role>('standard');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await apiService.getUsers();
      setUsers(list);
    } catch (err) {
      console.error(err);
      onShowToast('Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    try {
      await apiService.updateUser(userId, { role });
      setUsers(users.map((u) => (u.id === userId ? { ...u, role } : u)));
      onShowToast('User role updated');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to update role');
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await apiService.updateUser(userId, { is_active: !currentActive });
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: !currentActive } : u)));
      onShowToast(currentActive ? 'User account deactivated' : 'User account reactivated');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to update status');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    setIsCreating(true);
    try {
      const created = await apiService.createUser({
        email: newEmail,
        password: newPassword,
        display_name: newDisplayName || undefined,
        organization_id: newOrgId || organizations[0].id,
        role: newRole,
      });
      setUsers([...users, created]);
      setIsAddModalOpen(false);
      setNewEmail('');
      setNewDisplayName('');
      setNewPassword(generateSecurePassword());
      onShowToast(`Created team member ${created.email}`);
    } catch (err: any) {
      console.error(err);
      onShowToast(err.detail || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  // Metrics
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const standardCount = users.filter((u) => u.role === 'standard').length;
  const restrictedCount = users.filter((u) => u.role === 'restricted').length;

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
            Team & User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage practice accountants, client finance managers, and restricted uploaders.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-2 text-sm font-bold"
        >
          <UserPlus className="w-4 h-4" /> Add Team Member
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-card rounded-xl border border-border shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold uppercase">Total Users</span>
          <div className="text-3xl font-black text-foreground mt-1">{totalUsers}</div>
          <span className="text-xs text-muted-foreground">Active in practice boundary</span>
        </div>
        <div className="p-4 bg-card rounded-xl border border-border shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold uppercase">Administrators</span>
          <div className="text-3xl font-black text-primary mt-1">{adminCount}</div>
          <span className="text-xs text-muted-foreground">Full settings & user management</span>
        </div>
        <div className="p-4 bg-card rounded-xl border border-border shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold uppercase">Finance Staff</span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{standardCount}</div>
          <span className="text-xs text-muted-foreground">Standard Review & Approval</span>
        </div>
        <div className="p-4 bg-card rounded-xl border border-border shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold uppercase">Restricted Uploaders</span>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{restrictedCount}</div>
          <span className="text-xs text-muted-foreground">Store staff / uploader-scoped</span>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-card rounded-xl border border-border shadow-xs p-3.5 mb-4 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs text-muted-foreground font-bold uppercase tracking-wider">
                <th className="px-4 py-3.5">User / Email</th>
                <th className="px-4 py-3.5">Assigned Org</th>
                <th className="px-4 py-3.5">Access Tier / Role</th>
                <th className="px-3 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                    No users found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userOrg = organizations.find((o) => o.id === user.organization_id);
                  return (
                    <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                      {/* Name & Email */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                          {user.display_name}
                          {user.id === currentUser?.id && (
                            <span className="text-xs px-1.5 py-0.2 rounded bg-primary/15 text-primary font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{user.email}</div>
                      </td>

                      {/* Organization */}
                      <td className="px-4 py-3.5 font-semibold text-sm text-foreground">
                        {userOrg?.name || 'Central Practice'}
                      </td>

                      {/* Role Selector */}
                      <td className="px-4 py-3.5">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                          className="px-2.5 py-1 bg-muted/60 border border-border rounded text-sm font-semibold text-foreground cursor-pointer focus:border-primary"
                        >
                          <option value="admin">Administrator</option>
                          <option value="standard">Standard (Finance)</option>
                          <option value="restricted">Restricted (Uploader Only)</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 text-center">
                        {user.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          className={`h-8 text-sm ${
                            user.is_active
                              ? 'text-destructive hover:bg-destructive/10'
                              : 'text-primary hover:bg-primary/10'
                          }`}
                        >
                          {user.is_active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Team Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Team Member"
        subtitle="Provision a user account with role-based document access"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-foreground block mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="e.g. clerk@quickstop.ie"
              className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-bold text-foreground block mb-1">Display Name</label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-bold text-foreground block mb-1">Target Organization</label>
            <select
              value={newOrgId}
              onChange={(e) => setNewOrgId(e.target.value)}
              className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground font-semibold focus:outline-none focus:border-primary"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.org_type === 'accounting' ? 'Practice Boundary' : 'Client'})
                </option>
              ))}
            </select>
          </div>

          {/* Role Picker Cards */}
          <div>
            <label className="font-bold text-foreground block mb-1.5">Select Role Tier *</label>
            <div className="grid grid-cols-1 gap-2">
              <div
                onClick={() => setNewRole('admin')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  newRole === 'admin'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Practice / Org Administrator</span>
                  </div>
                  {newRole === 'admin' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Full control to manage team members, provision client companies, review, and delete invoices.
                </p>
              </div>

              <div
                onClick={() => setNewRole('standard')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  newRole === 'standard'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <span>Standard User (Finance / AP)</span>
                  </div>
                  {newRole === 'standard' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Can upload documents, review AI line items, modify GL codes, and approve invoices. Cannot manage users.
                </p>
              </div>

              <div
                onClick={() => setNewRole('restricted')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  newRole === 'restricted'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Restricted Uploader (Store Level)</span>
                  </div>
                  {newRole === 'restricted' && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Uploader-scoped only: Can only upload and view their personally uploaded invoices. Cannot approve or view peers' documents.
                </p>
              </div>
            </div>
          </div>

          {/* Secure Password Generator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-foreground flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-primary" /> Generated Initial Password
              </label>
              <button
                type="button"
                onClick={() => setNewPassword(generateSecurePassword())}
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            </div>
            <input
              type="text"
              readOnly
              value={newPassword}
              className="w-full p-2 bg-muted font-mono text-xs text-foreground rounded-lg border border-border"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isCreating} className="font-bold">
              {isCreating ? 'Creating...' : 'Provision User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
