'use client';

import { useEffect, useState } from 'react';
import type { Language } from '@/store/useLanguageStore';
import { cn } from '@/lib/utils';
import type { MarketingCopy } from './copy';
import { PrimaryCta, TawlaxLogo } from './shared';

export function SiteHeader({
  copy,
  language,
  onToggleLanguage,
  whatsappHref,
}: {
  copy: MarketingCopy;
  language: Language;
  onToggleLanguage: () => void;
  whatsappHref: string;
}) {
  // At the very top the header floats transparently over the cinematic hero
  // (light text); once you scroll past it, it settles into a solid white bar.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const nav = [
    { href: '#problem', label: copy.nav.problem },
    { href: '#how', label: copy.nav.how },
    { href: '#product', label: copy.nav.product },
    { href: '#contact', label: copy.nav.contact },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-colors duration-300',
        scrolled ? 'border-stone-200 bg-white/90 backdrop-blur' : 'border-transparent bg-transparent'
      )}
    >
      <div className="mx-auto flex h-15 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-5 md:px-8">
        <a
          href="#top"
          className="rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950"
          aria-label="Tawlax"
        >
          <TawlaxLogo dark={!scrolled} />
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {nav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm transition-colors',
                scrolled
                  ? 'text-stone-600 hover:text-stone-950'
                  : 'text-white/80 hover:text-white'
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
          <button
            type="button"
            onClick={onToggleLanguage}
            className={cn(
              'inline-flex h-9 items-center rounded-[6px] px-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950 sm:h-10 sm:px-3 sm:text-sm',
              scrolled ? 'text-stone-600 hover:text-stone-950' : 'text-white/85 hover:text-white'
            )}
            // Announce the language you would switch TO, in that language.
            lang={language === 'ar' ? 'en' : 'ar'}
          >
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
          <PrimaryCta
            href={whatsappHref}
            className={cn(
              'h-9 px-2.5 text-[13px] sm:h-10 sm:px-4 sm:text-sm',
              !scrolled && 'bg-white text-stone-950 hover:bg-white/90'
            )}
          >
            {copy.cta.startFreeTrial}
          </PrimaryCta>
        </div>
      </div>
    </header>
  );
}
