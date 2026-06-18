'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import Lenis from 'lenis';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * ── Marketing motion toolkit ────────────────────────────────────────────────
 * Scroll choreography primitives for the marketing site only. Every primitive
 * degrades to a static, fully-readable layout under `prefers-reduced-motion`,
 * and all scroll-linked transforms are vertical (RTL-agnostic) unless a piece
 * explicitly mirrors itself by reading `dir`.
 */

/**
 * True only after the component has mounted on the client. Used to keep SSR and
 * the first client render identical (framer-motion serializes MotionValue-driven
 * transforms differently across the hydration boundary), then attach motion.
 */
export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/**
 * SSR-safe media-query subscription (no setState-in-effect). Returns `false`
 * during SSR and the first client render, then the real match after hydration.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/**
 * Layers Lenis's gentle inertia on top of native scrolling — never a hard
 * hijack. Smoothing is disabled entirely on touch devices and under reduced
 * motion, where the page falls back to plain native scroll. In-page anchor
 * links are routed through Lenis so they ease (and clear the sticky header).
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    // Keep native momentum/feel on touch; only ease pointer/wheel scrolling.
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const instance = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });

    let frame = 0;
    const raf = (time: number) => {
      instance.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest('a[href^="#"]');
      const hash = anchor?.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      instance.scrollTo(target as HTMLElement, { offset: -64 });
      history.replaceState(null, '', hash);
    };
    document.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('click', onClick);
      instance.destroy();
    };
  }, [reduce]);

  return <>{children}</>;
}

/** Thin reading-progress bar pinned to the very top; grows from the start edge. */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  if (reduce || !mounted) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-emerald-600 rtl:origin-right"
    />
  );
}

/**
 * Reveal-on-scroll: a quiet fade + lift the first time the block enters view.
 * Vertical only, so it reads identically in LTR and RTL. No-op under reduced
 * motion (children render in their final, visible state).
 */
export function Reveal({
  children,
  className,
  y = 22,
  delay = 0,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  once?: boolean;
}) {
  // Always a motion.div for SSR/hydration stability; the page-level
  // `MotionConfig reducedMotion="user"` neutralizes the transform under reduced
  // motion (content still appears), so no reduce-branch is needed here.
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Press feedback (skill `scale-feedback`): a subtle, springy shrink while held.
 * Spread onto the CTAs (`motion.a`). The page-level `MotionConfig
 * reducedMotion="user"` neutralizes the transform when motion is reduced.
 */
export const pressMotion = {
  whileTap: { scale: 0.97 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 28 },
};

/** Wraps a non-anchor block (e.g. a surface card) with the same scale-on-press. */
export function ScaleTap({
  children,
  className,
  amount = 0.985,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      whileTap={{ scale: amount }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Vertical parallax for editorial imagery. The child should be over-sized (the
 * `ParallaxImage` frame handles that) so the drift never exposes an edge.
 */
export function Parallax({
  children,
  className,
  distance = 60,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <motion.div ref={ref} style={mounted && !reduce ? { y } : undefined} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * An image inside a fixed-ratio, clipped frame with a slow parallax drift.
 * The image is scaled past the frame so the drift stays edge-safe. Reduced
 * motion keeps a still, centered crop.
 */
export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  grayscale = false,
  sizes = '100vw',
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  grayscale?: boolean;
  sizes?: string;
}) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <motion.img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        sizes={sizes}
        style={mounted && !reduce ? { y } : undefined}
        className={cn(
          'absolute inset-x-0 top-1/2 h-[118%] w-full -translate-y-1/2 object-cover',
          grayscale && 'grayscale',
          imgClassName
        )}
      />
    </div>
  );
}
