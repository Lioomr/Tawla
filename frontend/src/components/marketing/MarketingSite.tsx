'use client';

import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { MotionConfig } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getCopy, whatsappLink } from './copy';
import { CinematicScroll } from './CinematicScroll';
import { Hero } from './Hero';
import { ScrollNarrative } from './ScrollNarrative';
import { ScrollProgress, SmoothScroll } from './motion';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import {
  FinalCtaSection,
  FitSection,
  OutcomesSection,
  ProblemSection,
  SurfacesSection,
} from './sections';

/**
 * Public Tawlax branding/marketing site, rendered at `/`.
 *
 * Reuses the customer language store, so a visitor who picks Arabic here keeps
 * Arabic after scanning a table QR. `useLanguage` also keeps `<html dir lang>`
 * in sync, which drives the RTL layout.
 */
export function MarketingSite({ fontClasses }: { fontClasses: string }) {
  const { language, dir, toggle, setLanguage } = useLanguage();
  const copy = getCopy(language);
  const whatsappHref = whatsappLink(copy.cta.whatsappMessage);

  // Allow deep-linking a language (e.g. /?lang=ar from ads or WhatsApp links).
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (requested === 'ar' || requested === 'en') setLanguage(requested);
  }, [setLanguage]);

  const arabic = language === 'ar';
  const tokens: CSSProperties = {
    // Body: Geist first in English; the Arabic face must lead in Arabic because
    // Geist's Arial-based fallback would otherwise claim Arabic glyphs.
    fontFamily: arabic
      ? 'var(--font-arabic), var(--font-sans), system-ui, sans-serif'
      : 'var(--font-sans), var(--font-arabic), system-ui, sans-serif',
    // Display: Archivo wide+heavy in English, Plex Arabic bold in Arabic
    // (Archivo has no Arabic glyphs, and Plex Arabic tops out at 700).
    ['--font-display' as string]: arabic ? 'var(--font-arabic)' : 'var(--font-display-latin)',
    ['--display-weight' as string]: arabic ? '700' : '800',
    ['--display-stretch' as string]: arabic ? '100%' : '125%',
    // Mono carries timestamps and statuses; Arabic words inside mono labels
    // fall through to the Arabic face, like a real Egyptian receipt.
    ['--font-mono' as string]:
      'var(--font-marketing-mono), var(--font-arabic), ui-monospace, monospace',
  };

  return (
    <div
      id="top"
      dir={dir}
      className={cn('min-h-screen scroll-smooth bg-white text-stone-950 antialiased', fontClasses)}
      style={tokens}
    >
      <MotionConfig reducedMotion="user">
        <SmoothScroll>
          <ScrollProgress />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-[6px] focus:bg-stone-950 focus:px-4 focus:py-2 focus:text-white"
          >
            {copy.meta.skipToContent}
          </a>
          <SiteHeader
            copy={copy}
            language={language}
            onToggleLanguage={toggle}
            whatsappHref={whatsappHref}
          />
          <main id="main">
            <Hero copy={copy} whatsappHref={whatsappHref} />
            <ProblemSection copy={copy} />
            <CinematicScroll copy={copy} />
            <ScrollNarrative copy={copy} dir={dir} />
            <SurfacesSection copy={copy} dir={dir} />
            <FitSection copy={copy} />
            <OutcomesSection copy={copy} />
            <FinalCtaSection copy={copy} whatsappHref={whatsappHref} />
          </main>
          <SiteFooter copy={copy} whatsappHref={whatsappHref} />
        </SmoothScroll>
      </MotionConfig>
    </div>
  );
}
