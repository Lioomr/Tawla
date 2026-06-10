'use client';

import { useLanguage } from '@/lib/i18n';
import type { Language } from '@/store/useLanguageStore';

// Compact segmented control to switch the customer UI language (Arabic/English).
// Always rendered LTR so the two options keep a stable position regardless of
// the active language/page direction.
export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  const options: { code: Language; label: string }[] = [
    { code: 'ar', label: t('arabic') },
    { code: 'en', label: t('english') },
  ];

  return (
    <div
      dir="ltr"
      className={`inline-flex shrink-0 items-center rounded-full border p-0.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur ${className ?? ''}`}
      style={{ borderColor: 'color-mix(in srgb, var(--brand-accent) 45%, transparent)' }}
    >
      {options.map((opt) => {
        const active = language === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLanguage(opt.code)}
            aria-pressed={active}
            style={active ? { backgroundColor: 'var(--brand-accent)', color: 'var(--brand-on-accent)' } : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold tracking-tight transition-colors ${
              active ? '' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
