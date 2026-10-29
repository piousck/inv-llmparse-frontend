import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3400);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const isError =
    message?.toLowerCase().includes('failed') ||
    message?.toLowerCase().includes('error') ||
    message?.includes('⚠️') ||
    message?.toLowerCase().includes('cannot') ||
    message?.toLowerCase().includes('skipped');

  const isSuccess =
    !isError &&
    Boolean(
      message?.startsWith('✓') ||
      message?.startsWith('🎉') ||
      message?.toLowerCase().includes('success') ||
      message?.toLowerCase().includes('approved') ||
      message?.toLowerCase().includes('saved') ||
      message?.toLowerCase().includes('deleted') ||
      message?.toLowerCase().includes('unlocked') ||
      message?.toLowerCase().includes('created') ||
      message?.toLowerCase().includes('updated') ||
      message?.toLowerCase().includes('re-running') ||
      message?.toLowerCase().includes('reprocessing') ||
      message?.toLowerCase().includes('dispatched') ||
      message?.toLowerCase().includes('completed') ||
      message?.toLowerCase().includes('welcome')
    );

  // Strip any legacy leading emoji or symbol prefixes for a clean professional look
  const cleanMessage = (message || '').replace(/^[\s✓🎉⚠️ℹ️🔓⚡🌐]+/, '').trim();

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-6 right-6 z-50 pointer-events-auto"
        >
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900/95 dark:bg-slate-900/95 text-white shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs font-medium max-w-md ring-1 ring-white/10">
            {isSuccess ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : isError ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-primary shrink-0" />
            )}
            <span className="flex-1 leading-snug">{cleanMessage}</span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 cursor-pointer transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
