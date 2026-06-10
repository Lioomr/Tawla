'use client';

import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

// Shared destructive-action confirmation modal. Render inside <AnimatePresence>.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  isPending,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200"
      >
        <h3 className="text-lg font-black tracking-tight mb-2 text-stone-900">{title}</h3>
        <p className="text-stone-500 font-medium text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2.5 font-bold tracking-tight text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 font-bold tracking-tight text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors flex items-center justify-center text-sm"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ConfirmDialog;
