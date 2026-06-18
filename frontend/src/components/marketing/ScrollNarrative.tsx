'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, BellRing, ChefHat, Smartphone } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MarketingCopy } from './copy';
import { display, MonoTag, Section } from './shared';
import { Reveal, useMediaQuery } from './motion';

/**
 * THE signature moment: one order moving through Tawlax, scrubbed to scroll.
 *
 * On large screens this pins a stage and, as the visitor scrolls, a live order
 * chip travels customer phone → kitchen display → waiter screen; each screen
 * lights up and updates its real state while the timeline caption advances.
 * On smaller screens and under reduced motion it degrades to a static, fully
 * readable vertical telling of the same six beats — no pinning, no jank.
 */

type BeatKey = 'scan' | 'placed' | 'ready' | 'paid';

interface Beat {
  /** Which screen the action is on: 0 customer, 1 kitchen, 2 waiter. */
  station: 0 | 1 | 2;
  key: BeatKey;
  customer: string;
  /** Kitchen ticket status chip, or null before the ticket exists. */
  kitchen: string | null;
  waiter: string | null;
}

const KEY_CHIP: Record<BeatKey, string> = {
  scan: 'bg-stone-400/15 text-stone-300',
  placed: 'bg-amber-400/15 text-amber-300',
  ready: 'bg-emerald-400/20 text-emerald-300',
  paid: 'bg-stone-400/15 text-stone-300',
};
const KEY_DOT: Record<BeatKey, string> = {
  scan: 'bg-stone-400',
  placed: 'bg-amber-500',
  ready: 'bg-emerald-600',
  paid: 'bg-stone-400',
};

/** Resolve the six beats from bilingual copy (no hardcoded strings). */
function buildBeats(copy: MarketingCopy): Beat[] {
  const p = copy.live.phases; // [placed, preparing, ready, paid]
  const steps = copy.timeline.steps; // [scan, order, board, ready, served, paid]
  return [
    { station: 0, key: 'scan', customer: steps[0].title, kitchen: null, waiter: null },
    { station: 0, key: 'placed', customer: p[0].customerLine, kitchen: null, waiter: p[0].waiterLine },
    { station: 1, key: 'placed', customer: p[1].customerLine, kitchen: p[0].kitchenStatus, waiter: p[0].waiterLine },
    { station: 2, key: 'ready', customer: p[2].customerLine, kitchen: p[2].kitchenStatus, waiter: p[2].waiterLine },
    { station: 2, key: 'ready', customer: steps[4].title, kitchen: p[3].kitchenStatus, waiter: steps[4].title },
    { station: 2, key: 'paid', customer: p[3].customerLine, kitchen: p[3].kitchenStatus, waiter: p[3].waiterLine },
  ];
}

/* ── Screens ──────────────────────────────────────────────────────────────── */

function PanelHead({
  icon: Icon,
  label,
  trailing,
  dark = false,
}: {
  icon: typeof Smartphone;
  label: string;
  trailing?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p
        className={cn(
          'inline-flex items-center gap-2 font-mono text-[12px] font-medium',
          dark ? 'text-stone-400' : 'text-stone-500'
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        {label}
      </p>
      {trailing}
    </div>
  );
}

function CustomerPanel({ copy, beat }: { copy: MarketingCopy; beat: Beat }) {
  const { live } = copy;
  return (
    <div className="flex h-full flex-col rounded-[12px] border border-stone-200 bg-white p-4">
      <PanelHead
        icon={Smartphone}
        label={live.customerRole}
        trailing={<span className="font-mono text-[11px] text-stone-400">{live.tableTag}</span>}
      />
      <div className="mt-3 space-y-1.5 text-sm text-stone-950">
        {live.orderLines.map((line) => (
          <p key={line.name} className="flex justify-between gap-3">
            <span>
              <span className="font-mono">{line.qty}×</span> {line.name}
            </span>
          </p>
        ))}
        <p className="text-stone-500">{live.note}</p>
      </div>
      <p className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-sm">
        <span className="text-stone-500">{live.totalLabel}</span>
        <span className="font-mono font-medium tabular-nums text-stone-950">{live.total}</span>
      </p>
      <p className="mt-auto flex items-center gap-2 pt-4 text-sm font-medium text-stone-950">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', KEY_DOT[beat.key])} aria-hidden="true" />
        {beat.customer}
      </p>
    </div>
  );
}

function KitchenPanel({ copy, beat }: { copy: MarketingCopy; beat: Beat }) {
  const { live } = copy;
  const waiting = beat.kitchen === null;
  return (
    <div className="flex h-full flex-col rounded-[12px] border border-stone-800 bg-stone-950 p-4">
      <PanelHead icon={ChefHat} label={live.kitchenRole} dark />
      <div
        className={cn(
          'mt-3 flex flex-1 flex-col rounded-[8px] border bg-stone-900 p-3.5 transition-opacity',
          waiting ? 'border-stone-800 opacity-40' : 'border-stone-700'
        )}
      >
        <div className="flex items-center justify-between font-mono text-[12px]">
          <span className="font-semibold text-white">{live.tableTag}</span>
        </div>
        <div className="mt-2.5 space-y-1 text-[13px] text-stone-300">
          {live.orderLines.map((line) => (
            <p key={line.name}>
              <span className="font-mono text-white">{line.qty}×</span> {line.name}
            </p>
          ))}
          <p className="text-stone-500">{live.note}</p>
        </div>
        {beat.kitchen && (
          <span
            className={cn(
              'mt-auto inline-block w-fit rounded-[4px] px-2 py-0.5 font-mono text-[12px] font-semibold',
              KEY_CHIP[beat.key]
            )}
          >
            {beat.kitchen}
          </span>
        )}
      </div>
    </div>
  );
}

function WaiterPanel({ copy, beat }: { copy: MarketingCopy; beat: Beat }) {
  const { live } = copy;
  const idle = beat.waiter === null;
  return (
    <div className="flex h-full flex-col rounded-[12px] border border-stone-200 bg-white p-4">
      <PanelHead icon={BellRing} label={live.waiterRole} />
      <div className={cn('mt-3 flex items-center gap-3', idle && 'opacity-40')}>
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border font-mono text-sm font-semibold tabular-nums',
            beat.key === 'ready'
              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
              : beat.key === 'paid'
                ? 'border-stone-200 bg-stone-100 text-stone-500'
                : 'border-stone-300 text-stone-950'
          )}
        >
          T12
        </span>
        <p className="text-sm font-medium text-stone-950">{beat.waiter ?? live.tableTag}</p>
      </div>
    </div>
  );
}

function ScreenByIndex({ index, copy, beat }: { index: 0 | 1 | 2; copy: MarketingCopy; beat: Beat }) {
  if (index === 0) return <CustomerPanel copy={copy} beat={beat} />;
  if (index === 1) return <KitchenPanel copy={copy} beat={beat} />;
  return <WaiterPanel copy={copy} beat={beat} />;
}

/* ── Pinned (large screens) ──────────────────────────────────────────────── */

function PinnedScreen({
  index,
  copy,
  beat,
  stationFloat,
}: {
  index: 0 | 1 | 2;
  copy: MarketingCopy;
  beat: Beat;
  stationFloat: MotionValue<number>;
}) {
  const opacity = useTransform(stationFloat, [index - 1, index, index + 1], [0.45, 1, 0.45]);
  const scale = useTransform(stationFloat, [index - 1, index, index + 1], [0.95, 1, 0.95]);
  const ring = useTransform(stationFloat, [index - 0.55, index, index + 0.55], [0, 1, 0]);
  return (
    <motion.div style={{ opacity, scale }} className="relative">
      <motion.div
        aria-hidden="true"
        style={{ opacity: ring }}
        className="pointer-events-none absolute -inset-px rounded-[13px] ring-2 ring-emerald-500/70"
      />
      <ScreenByIndex index={index} copy={copy} beat={beat} />
    </motion.div>
  );
}

function PinnedNarrative({ copy, beats, dir }: { copy: MarketingCopy; beats: Beat[]; dir: 'ltr' | 'rtl' }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const i = Math.min(beats.length - 1, Math.max(0, Math.floor(v * beats.length)));
    setActive(i);
  });

  // Smooth station travel (customer 0 → kitchen 1 → waiter 2) across the scroll.
  const stationFloat = useSpring(
    useTransform(scrollYProgress, [0, 0.2, 0.4, 0.6, 0.8, 1], [0, 0, 1, 2, 2, 2]),
    { stiffness: 90, damping: 24, mass: 0.4 }
  );
  const cols = dir === 'rtl' ? ['83.333%', '50%', '16.667%'] : ['16.667%', '50%', '83.333%'];
  const chipLeft = useTransform(stationFloat, [0, 1, 2], cols);
  const railFill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  const step = copy.timeline.steps[active];
  const beat = beats[active];

  return (
    <div ref={wrapRef} className="relative h-[520vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <MonoTag>{copy.timeline.metaLine}</MonoTag>
              <h2 className={cn(display, 'mt-2 max-w-2xl text-3xl leading-[1.08] text-stone-950 lg:text-4xl')}>
                {copy.timeline.heading}
              </h2>
            </div>
          </div>

          {/* Service line — the order chip rides it between the three stations. */}
          <div className="relative h-9">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-stone-200" />
            <motion.div
              aria-hidden="true"
              style={{ scaleX: railFill }}
              className="absolute inset-x-0 top-1/2 h-px origin-left -translate-y-1/2 bg-emerald-600 rtl:origin-right"
            />
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden="true"
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-300"
                style={{ left: dir === 'rtl' ? cols[2 - i] : cols[i] }}
              />
            ))}
            <motion.div
              aria-hidden="true"
              style={{ left: chipLeft }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600 bg-white px-2.5 py-1 font-mono text-[11px] font-medium tabular-nums text-emerald-800 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                #347 · T12
              </span>
            </motion.div>
          </div>

          {/* Three live screens */}
          <div className="grid grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <PinnedScreen
                key={i}
                index={i as 0 | 1 | 2}
                copy={copy}
                beat={beat}
                stationFloat={stationFloat}
              />
            ))}
          </div>

          {/* Caption + step rail */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="max-w-xl"
              >
                <p className="flex items-center gap-3 font-mono text-[13px] tabular-nums text-stone-500">
                  <span>{step.time}</span>
                  <span className="h-px w-6 bg-stone-300" />
                  <span className="font-semibold text-stone-950">{step.title}</span>
                </p>
                <p className="mt-2 leading-relaxed text-stone-600">{step.body}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex shrink-0 items-center gap-2" aria-hidden="true">
              {beats.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === active ? 'w-6 bg-emerald-600' : 'w-1.5 bg-stone-300'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stacked (small screens / reduced motion) ────────────────────────────── */

function StackedNarrative({ copy, beats }: { copy: MarketingCopy; beats: Beat[] }) {
  const steps = copy.timeline.steps;
  const stations = [copy.live.customerRole, copy.live.kitchenRole, copy.live.waiterRole];
  return (
    <Section id="how">
      <MonoTag>{copy.timeline.metaLine}</MonoTag>
      <h2 className={cn(display, 'mt-4 max-w-3xl text-3xl leading-[1.08] text-stone-950 sm:text-4xl md:text-5xl')}>
        {copy.timeline.heading}
      </h2>

      {/* Static station flow so the three screens still read on mobile. */}
      <Reveal className="mt-10 flex flex-wrap items-center gap-3 font-mono text-[12px] text-stone-500">
        {stations.map((label, i) => (
          <span key={label} className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {label}
            </span>
            {i < stations.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-stone-300 rtl:-scale-x-100" strokeWidth={2} aria-hidden="true" />
            )}
          </span>
        ))}
      </Reveal>

      {/* The order, beat by beat. */}
      <ol className="mt-12 max-w-3xl">
        {steps.map((step, i) => {
          const last = i === steps.length - 1;
          const beat = beats[i];
          return (
            <li key={step.time + step.title}>
              <Reveal className="flex gap-5 sm:gap-7">
                <span className="w-20 shrink-0 pt-0.5 font-mono text-[13px] tabular-nums text-stone-500 sm:w-24 sm:text-sm">
                  {step.time}
                </span>
                <span className="flex flex-col items-center" aria-hidden="true">
                  <span
                    className={cn(
                      'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                      last ? 'bg-emerald-700' : 'border-2 border-stone-950 bg-white'
                    )}
                  />
                  {!last && <span className="w-px flex-1 bg-stone-200" />}
                </span>
                <div className={cn('-mt-0.5', !last && 'pb-10')}>
                  <h3 className="font-semibold text-stone-950">{step.title}</h3>
                  <p className="mt-1 leading-relaxed text-stone-600">{step.body}</p>
                  <p className="mt-2 inline-flex items-center gap-2 font-mono text-[11px] text-stone-400">
                    <span className={cn('h-1.5 w-1.5 rounded-full', KEY_DOT[beat.key])} />
                    {[copy.live.customerRole, copy.live.kitchenRole, copy.live.waiterRole][beat.station]}
                  </p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

/* ── Switch ──────────────────────────────────────────────────────────────── */

export function ScrollNarrative({ copy, dir }: { copy: MarketingCopy; dir: 'ltr' | 'rtl' }) {
  const reduce = useReducedMotion();
  // SSR + first client render = stacked (safe, content-complete). Promote to the
  // pinned experience only once we know the viewport is wide enough for it.
  const wide = useMediaQuery('(min-width: 1024px)');
  const pinned = wide && !reduce;

  const beats = buildBeats(copy);

  if (pinned) {
    return (
      <section id="how" className="border-t border-stone-200">
        <PinnedNarrative copy={copy} beats={beats} dir={dir} />
      </section>
    );
  }
  return (
    <div className="border-t border-stone-200">
      <StackedNarrative copy={copy} beats={beats} />
    </div>
  );
}
