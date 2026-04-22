'use client';

import { QrCode, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SessionExpiredPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-sm w-full text-center"
      >
        <div className="w-20 h-20 bg-zinc-100 border border-zinc-200 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <RotateCcw className="w-10 h-10 text-zinc-400" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 mb-3">
          Session Expired
        </h1>

        <p className="text-zinc-500 font-medium leading-relaxed mb-8">
          Your table session has timed out. Please scan the QR code on your table to start a new session.
        </p>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <QrCode className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-sm font-bold tracking-tight text-zinc-400">
            Scan your table&apos;s QR code to continue
          </p>
        </div>
      </motion.div>
    </div>
  );
}
