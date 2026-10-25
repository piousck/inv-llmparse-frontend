import React, { useState } from 'react';
import { Building, Building2, Key, RefreshCw, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { generateSecurePassword } from '../../lib/utils';
import { apiService } from '../../services/api';
import { AuthResponse, IndustryCode, IndustryPreset, INDUSTRY_PRESETS } from '../../types/api';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (auth: AuthResponse) => void;
  onSwitchToLogin: () => void;
  onShowToast: (msg: string) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToLogin,
  onShowToast,
}) => {
  const [orgName, setOrgName] = useState<string>('');
  const [orgType, setOrgType] = useState<'accounting' | 'client'>('accounting');
  const [industry, setIndustry] = useState<IndustryCode>('general');
  const [presets, setPresets] = useState<IndustryPreset[]>(INDUSTRY_PRESETS);
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>(() => generateSecurePassword());
  const [trustComputer, setTrustComputer] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  React.useEffect(() => {
    apiService.getIndustryPresets().then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setPresets(res);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiService.register({
        organization_name: orgName,
        org_type: orgType,
        industry,
        email,
        password,
        display_name: displayName,
        trust_computer: trustComputer,
      });
      onShowToast(`Welcome, ${res.user.display_name}! Organization created.`);
      onSuccess(res);
      onClose();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Your Organization"
      subtitle="Provision an accounting practice or standalone company with automated invoice parsing"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Account Type Card Selector */}
        <div>
          <label className="font-bold text-foreground block mb-1.5">Account Type *</label>
          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => setOrgType('accounting')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                orgType === 'accounting'
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border bg-card hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Building className="w-4 h-4 text-primary" />
                  <span>Practice Firm</span>
                </div>
                {orgType === 'accounting' && <Check className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Multi-client account. Manage and switch across client company portfolios.
              </p>
            </div>

            <div
              onClick={() => setOrgType('client')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                orgType === 'client'
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border bg-card hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Standalone Co.</span>
                </div>
                {orgType === 'client' && <Check className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Single business account. Store, review, and process your company invoices.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="font-bold text-foreground block mb-1">Company / Firm Name *</label>
          <input
            type="text"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g. Apex Accounting Practice Ltd"
            className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-foreground block mb-1">Industry Preset</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as IndustryCode)}
              className="w-full p-2 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              {presets.map((p) => (
                <option key={p.industry_code} value={p.industry_code}>
                  {p.display_name}
                </option>
              ))}
            </select>
            {presets.find((p) => p.industry_code === industry) && (
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1" title={presets.find((p) => p.industry_code === industry)?.description}>
                {presets.find((p) => p.industry_code === industry)?.description}
              </p>
            )}
          </div>

          <div>
            <label className="font-bold text-foreground block mb-1">Admin Full Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-foreground block mb-1">Admin Email Address *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. admin@apexpractice.ie"
            className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-foreground flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-primary" /> Password *
            </label>
            <button
              type="button"
              onClick={() => setPassword(generateSecurePassword())}
              className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Generate Secure Password
            </button>
          </div>
          <input
            type="text"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 bg-muted font-mono text-xs text-foreground rounded-lg border border-border"
          />
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="checkbox"
            id="trust-computer-register"
            checked={trustComputer}
            onChange={(e) => setTrustComputer(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer accent-primary"
          />
          <label htmlFor="trust-computer-register" className="text-xs text-muted-foreground select-none cursor-pointer">
            Trust this computer for 30 days
          </label>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer"
          >
            Already registered? Log in
          </button>
          <Button variant="primary" size="sm" type="submit" disabled={loading} className="font-bold">
            {loading ? 'Creating Org...' : 'Register & Enter'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
