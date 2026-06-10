'use client';

import { QrCode, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBrandTheme, useHydratedBranding } from '@/hooks/useBrandTheme';
import { brandName, getTextDir } from '@/lib/branding';
import { useLanguage } from '@/lib/i18n';

export default function SessionExpiredPage() {
  const branding = useHydratedBranding();
  useBrandTheme();
  const { t, dir } = useLanguage();
  // Only name-drop the restaurant when we actually have its branding, otherwise
  // keep the copy generic (no white-label placeholder mid-sentence).
  const name = branding ? brandName(branding) : null;
  const namedParts = name ? t('sessionExpiredBodyNamed').split('{name}') : null;

  return (
    <div dir={dir} className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
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
          {t('sessionExpired')}
        </h1>

        <p className="text-zinc-500 font-medium leading-relaxed mb-8">
          {namedParts ? (
            <>
              {namedParts[0]}
              <span dir={getTextDir(name)} className="font-bold text-zinc-700">{name}</span>
              {namedParts[1]}
            </>
          ) : (
            t('sessionExpiredBody')
          )}{' '}
          {t('sessionExpiredScan')}
        </p>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <QrCode className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-sm font-bold tracking-tight text-zinc-400">
            {t('scanToContinue')}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
