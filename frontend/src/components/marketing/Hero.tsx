'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MarketingCopy } from './copy';
import { display, PrimaryCta, SecondaryCta } from './shared';
import { useMounted } from './motion';

/**
 * Full-bleed cinematic background: the poster paints first (LCP), the muted
 * looping video fades in on top once it can play. Video is skipped entirely on
 * small screens, under reduced motion, and when the browser asks to save data —
 * so weak connections only ever pay for the ~35KB poster.
 */
function HeroBackdrop({ posterAlt, scale }: { posterAlt: string; scale?: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const [showVideo, setShowVideo] = useState(false);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (reduce) return;
    type NetworkInfo = { saveData?: boolean };
    const conn = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    if (conn?.saveData) return;
    if (!window.matchMedia('(min-width: 768px)').matches) return;
    // Let the poster paint before we bring in the heavier asset.
    const start = () => setShowVideo(true);
    const idle = (window as typeof window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (idle) {
      const id = idle(start);
      return () => (window as typeof window & { cancelIdleCallback?: (id: number) => void })
        .cancelIdleCallback?.(id);
    }
    const t = setTimeout(start, 200);
    return () => clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (showVideo) videoRef.current?.play().catch(() => {});
  }, [showVideo]);

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-stone-950">
      {/* Backdrop layer scales up a touch as you scroll (scroll-linked Ken-Burns).
          transform-only so it stays GPU-cheap; the scrims below never scale. */}
      <motion.div style={scale ? { scale } : undefined} className="absolute inset-0 will-change-transform">
        <picture>
          <source srcSet="/marketing/hero-poster.avif" type="image/avif" />
          <img
            src="/marketing/hero-poster.webp"
            alt={posterAlt}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
        {showVideo && (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="auto"
            poster="/marketing/hero-poster.webp"
            onPlaying={() => setReady(true)}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out',
              ready ? 'opacity-100' : 'opacity-0'
            )}
          >
            <source src="/marketing/hero-loop.webm" type="video/webm" />
            <source src="/marketing/hero-loop.mp4" type="video/mp4" />
          </video>
        )}
      </motion.div>
      {/* Scrims: bottom-up wash for the copy, plus a start-edge gradient so the
          headline always sits on near-black regardless of the frame behind it. */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/55 to-stone-950/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-950/20 to-transparent rtl:bg-gradient-to-l" />
    </div>
  );
}

/** A small live order ticket floated over the film — proof the product is real. */
function LiveTicket({ copy }: { copy: MarketingCopy }) {
  const { live } = copy;
  return (
    <div className="w-[19rem] max-w-full rounded-[12px] border border-white/15 bg-stone-950/55 p-4 font-mono text-[13px] tabular-nums text-stone-200 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-medium text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          {live.liveWord}
        </span>
        <span className="text-stone-400">{copy.timeline.metaLine}</span>
      </div>
      <div className="mt-3 space-y-1 text-stone-100">
        {live.orderLines.map((line) => (
          <p key={line.name} className="flex items-center gap-2">
            <span className="text-emerald-300">{line.qty}×</span> {line.name}
          </p>
        ))}
        <p className="text-stone-400">{live.note}</p>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
        <span className="text-stone-400">{live.totalLabel}</span>
        <span className="font-medium text-white">{live.total}</span>
      </div>
    </div>
  );
}

export function Hero({ copy, whatsappHref }: { copy: MarketingCopy; whatsappHref: string }) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // Gentle scroll-away: copy drifts up and fades as you leave the hero.
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  // Scroll-linked Ken-Burns: the film slowly pushes in as the hero scrolls away.
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const animateContent = mounted && !reduce;

  return (
    <section
      ref={ref}
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-stone-950 text-white"
    >
      <HeroBackdrop posterAlt={copy.fit.imageAlt} scale={animateContent ? bgScale : undefined} />

      <motion.div
        style={animateContent ? { y: contentY, opacity: contentOpacity } : undefined}
        className="mx-auto w-full max-w-6xl px-5 pb-16 pt-28 md:px-8 md:pb-24 md:pt-32"
      >
        <div className="grid items-end gap-10 lg:grid-cols-[1.5fr_auto] lg:gap-12">
          <div>
            <h1
              className={cn(
                display,
                'max-w-3xl text-[2.6rem] leading-[1.02] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.5)] sm:text-6xl lg:text-7xl'
              )}
            >
              {copy.hero.headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-200">{copy.hero.sub}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PrimaryCta href={whatsappHref} large>
                <MessageCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                {copy.cta.startFreeTrial}
              </PrimaryCta>
              <SecondaryCta
                href="#how"
                className="border-white/30 text-white hover:border-white hover:bg-white/5"
              >
                {copy.cta.seeHowItWorks}
              </SecondaryCta>
            </div>
            <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5 font-mono text-[13px] text-stone-300">
              {copy.hero.proof.map((fact) => (
                <li key={fact} className="inline-flex items-center gap-2">
                  <span
                    className="h-1 w-1 shrink-0 rounded-full bg-emerald-400"
                    aria-hidden="true"
                  />
                  {fact}
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden lg:block">
            <LiveTicket copy={copy} />
          </div>
        </div>
      </motion.div>

      {/* Scroll cue — appears after mount, hidden under reduced motion. */}
      {mounted && !reduce && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center"
        >
          <span className="flex h-9 w-5 items-start justify-center rounded-full border border-white/40 p-1">
            <motion.span
              className="h-2 w-1 rounded-full bg-white/80"
              animate={{ y: [0, 10, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </div>
      )}
    </section>
  );
}
