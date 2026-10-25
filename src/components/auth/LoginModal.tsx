import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { apiService } from '../../services/api';
import { AuthResponse } from '../../types/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (auth: AuthResponse) => void;
  onSwitchToRegister: () => void;
  onShowToast: (msg: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToRegister,
  onShowToast,
}) => {
  const isLive = apiService.getMode() === 'live';
  const [email, setEmail] = useState<string>(
    isLive ? 'admin@apexpractice.ie' : 'sarah@apexpractice.ie'
  );
  const [password, setPassword] = useState<string>('password123');
  const [trustComputer, setTrustComputer] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      const live = apiService.getMode() === 'live';
      setEmail(live ? 'admin@apexpractice.ie' : 'sarah@apexpractice.ie');
      setPassword('password123');
      setTrustComputer(true);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiService.login(email, password, trustComputer);
      onShowToast(`Welcome back, ${res.user.display_name}!`);
      onSuccess(res);
      onClose();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.detail || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Sign In"
      subtitle="Access your accounting workspace and client invoice portfolio"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-bold text-foreground block mb-1">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="font-bold text-foreground block mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="checkbox"
            id="trust-computer-login"
            checked={trustComputer}
            onChange={(e) => setTrustComputer(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer accent-primary"
          />
          <label htmlFor="trust-computer-login" className="text-xs text-muted-foreground select-none cursor-pointer">
            Trust this computer for 30 days
          </label>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer"
          >
            Create account
          </button>
          <Button variant="primary" size="sm" type="submit" disabled={loading} className="gap-1.5 font-bold">
            <LogIn className="w-3.5 h-3.5" />
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
