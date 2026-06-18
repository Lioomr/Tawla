'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { pressMotion } from './motion';

/**
 * Display type treatment. The variables are set per-language on the marketing
 * root: Archivo wide+heavy in English, IBM Plex Sans Arabic bold in Arabic.
 * Letter-spacing stays 0 by design-brief rule.
 */
export const display =
  '[font-family:var(--font-display)] [font-weight:var(--display-weight)] [font-stretch:var(--display-stretch)] text-balance';

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn('scroll-mt-20 py-20 md:py-28', className)}>
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">{children}</div>
    </section>
  );
}

/**
 * A service-log style meta line (mono). Used only where it carries real
 * information about the section's content — a time, an order, a place.
 */
export function MonoTag({
  children,
  dark = false,
  className,
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'font-mono text-[13px] font-medium',
        dark ? 'text-stone-400' : 'text-stone-500',
        className
      )}
    >
      {children}
    </p>
  );
}

/** The Tawlax brand mark (cropped from `LOGO tawalax.png`) plus lowercase wordmark. */
export function TawlaxLogo({
  markSize = 24,
  dark = false,
  className,
}: {
  markSize?: number;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/brand/tawlax-mark.png"
        alt=""
        width={markSize}
        height={markSize}
        priority
        className={cn('shrink-0', dark && 'invert')}
      />
      <span
        className={cn('text-lg font-bold leading-none', dark ? 'text-white' : 'text-stone-950')}
        // The wordmark stays Latin lowercase in both languages, like the mark itself.
        dir="ltr"
      >
        tawlax
      </span>
    </span>
  );
}

export function PrimaryCta({
  href,
  children,
  large = false,
  className,
}: {
  href: string;
  children: React.ReactNode;
  large?: boolean;
  className?: string;
}) {
  return (
    <motion.a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...pressMotion}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[6px] bg-stone-950 font-medium text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950',
        large ? 'h-13 px-7 text-base' : 'h-10 px-4 text-sm',
        className
      )}
    >
      {children}
    </motion.a>
  );
}

export function SecondaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.a
      href={href}
      {...pressMotion}
      className={cn(
        'inline-flex h-13 items-center justify-center gap-2 rounded-[6px] border border-stone-300 px-7 text-base font-medium text-stone-950 transition-colors hover:border-stone-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950',
        className
      )}
    >
      {children}
    </motion.a>
  );
}
