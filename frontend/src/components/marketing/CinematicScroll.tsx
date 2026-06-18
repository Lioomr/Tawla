'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MarketingCopy } from './copy';
import { display } from './shared';
import { useMounted } from './motion';

/**
 * A full-bleed cinematic "breath" between the Problem and the order narrative:
 * the Friday-night rush — described in grayscale just above — comes alive in
 * colour, scrubbed to scroll. The film slowly drifts and settles while the
 * caption rises through frame and fades back out.
 *
 * The poster paints first (no layout shift, instant LCP-safe backdrop); the
 * muted loop fades in only on ≥768px, with motion allowed and data-saver off —
 * exactly like the hero, so weak connections only ever pay for the poster.
 * Under reduced motion / SSR everything sits still and fully readable.
 */
function useLazyVideo(reduce: boolean) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (reduce) return;
    type NetworkInfo = { saveData?: boolean };
    const conn = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    if (conn?.saveData) return;
    if (!window.matchMedia('(min-width: 768px)').matches) return;
    const start = () => setShow(true);
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
  return show;
}

export function CinematicScroll({ copy }: { copy: MarketingCopy }) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const showVideo = useLazyVideo(!!reduce);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const animate = mounted && !reduce;

  // Slow settle-then-drift on the film, plus a caption that rises through centre.
  const bgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1.02, 1.12]);
  const bgY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const capOpacity = useTransform(scrollYProgress, [0.12, 0.32, 0.62, 0.82], [0, 1, 1, 0]);
  const capY = useTransform(scrollYProgress, [0.12, 0.82], [56, -56]);

  useEffect(() => {
    if (showVideo) videoRef.current?.play().catch(() => {});
  }, [showVideo]);

  return (
    <section
      ref={ref}
      className="relative isolate flex min-h-[88svh] items-center justify-center overflow-hidden bg-stone-950 text-white"
    >
      <motion.div
        aria-hidden="true"
        style={animate ? { scale: bgScale, y: bgY } : undefined}
        className="absolute inset-0 -z-10 will-change-transform"
      >
        <picture>
          <source srcSet="/marketing/ramp-poster.avif" type="image/avif" />
          <img
            src="/marketing/ramp-poster.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full scale-110 object-cover"
          />
        </picture>
        {showVideo && (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            poster="/marketing/ramp-poster.webp"
            onPlaying={() => setReady(true)}
            className={cn(
              'absolute inset-0 h-full w-full scale-110 object-cover transition-opacity duration-[1200ms] ease-out',
              ready ? 'opacity-100' : 'opacity-0'
            )}
          >
            <source src="/marketing/ramp-loop.webm" type="video/webm" />
            <source src="/marketing/ramp-loop.mp4" type="video/mp4" />
          </video>
        )}
      </motion.div>

      {/* Wash so the caption always sits on near-black, top and bottom. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-stone-950 via-stone-950/35 to-stone-950/70"
      />

      <motion.div
        style={animate ? { opacity: capOpacity, y: capY } : undefined}
        className="mx-auto w-full max-w-4xl px-5 text-center md:px-8"
      >
        <p className="font-mono text-[13px] font-medium tabular-nums text-emerald-300/90">
          {copy.cinematic.kicker}
        </p>
        <p
          className={cn(
            display,
            'mt-5 text-3xl leading-[1.05] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)] sm:text-5xl md:text-6xl'
          )}
        >
          {copy.cinematic.line}
        </p>
      </motion.div>
    </section>
  );
}
