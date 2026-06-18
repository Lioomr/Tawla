'use client';

import { useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MarketingCopy } from './copy';
import { WHATSAPP_DISPLAY } from './copy';
import {
  AdminDashboardMock,
  CustomerMenuMock,
  KitchenBoardMock,
  WaiterBoardMock,
} from './mockups';
import { ParallaxImage, Reveal, useMediaQuery, useMounted } from './motion';
import { ScrollGallery } from './ScrollGallery';
import { display, MonoTag, PrimaryCta, Section } from './shared';

export function ProblemSection({ copy }: { copy: MarketingCopy }) {
  return (
    <Section id="problem">
      <Reveal>
        <MonoTag>{copy.problem.metaLine}</MonoTag>
        <h2
          className={cn(
            display,
            'mt-4 max-w-3xl text-3xl leading-[1.08] text-stone-950 sm:text-4xl md:text-5xl'
          )}
        >
          {copy.problem.heading}
        </h2>
      </Reveal>
      {/* The scene the meta line names: Friday night, full house, one pair of hands.
          Drifts slowly with scroll for depth; grayscale keeps it a backdrop, not a hero. */}
      <Reveal className="mt-12">
        <ParallaxImage
          src="/marketing/service-rush.webp"
          alt={copy.problem.imageAlt}
          grayscale
          sizes="(min-width: 1216px) 1088px, 100vw"
          className="aspect-[21/9] rounded-[8px] border border-stone-200"
        />
      </Reveal>
      <div className="mt-12 grid gap-x-14 gap-y-8 md:grid-cols-2">
        {copy.problem.items.map((item, i) => (
          <Reveal key={item.lead} delay={i * 0.05}>
            <p className="leading-relaxed text-stone-600">
              <strong className="font-semibold text-stone-950">{item.lead}</strong> {item.body}
            </p>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-12">
        <p className="max-w-3xl text-xl font-semibold text-stone-950 md:text-2xl">
          {copy.problem.closer}
        </p>
      </Reveal>
    </Section>
  );
}

export function SurfacesSection({ copy, dir }: { copy: MarketingCopy; dir: 'ltr' | 'rtl' }) {
  // SSR + first client render = the vertical fallback (content-complete, safe).
  // Promote to the pinned horizontal gallery only once the viewport is wide and
  // motion is allowed — same gate the order narrative uses.
  const wide = useMediaQuery('(min-width: 1024px)');
  const reduce = useReducedMotion();
  if (wide && !reduce) {
    return <ScrollGallery copy={copy} dir={dir} />;
  }

  const mocks = [
    <div key="customer" className="flex justify-center">
      <CustomerMenuMock copy={copy} className="origin-top scale-90 sm:scale-100" />
    </div>,
    <KitchenBoardMock key="kitchen" copy={copy} className="mk-elevate mx-auto max-w-[480px]" />,
    <WaiterBoardMock key="waiter" copy={copy} className="mk-elevate mx-auto max-w-[400px]" />,
    <AdminDashboardMock
      key="admin"
      copy={copy}
      className="mk-elevate mx-auto h-[250px] max-w-[480px]"
    />,
  ];

  return (
    // overflow-x-clip is a safety net so a wide mockup can never push past the
    // viewport edge. It clips horizontally only, leaving float shadows intact and
    // (unlike overflow:hidden) not creating a scroll container.
    <div className="overflow-x-clip border-t border-stone-200">
      <Section id="product">
        <Reveal>
          <h2
            className={cn(
              display,
              'max-w-3xl text-3xl leading-[1.08] text-stone-950 sm:text-4xl md:text-5xl'
            )}
          >
            {copy.surfaces.heading}
          </h2>
        </Reveal>
        <div className="mt-16 space-y-20 md:space-y-24">
          {copy.surfaces.roles.map((role, i) => (
            <div key={role.tag} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal className={cn(i % 2 === 1 && 'lg:order-2')}>
                <MonoTag>{role.tag}</MonoTag>
                <h3 className={cn(display, 'mt-3 text-2xl text-stone-950 md:text-3xl')}>
                  {role.title}
                </h3>
                <ul className="mt-6">
                  {role.lines.map((line) => (
                    <li
                      key={line}
                      className="border-t border-stone-200 py-3 leading-relaxed text-stone-600 last:border-b"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </Reveal>
              {/* Each screen floats (mk-elevate) and reveals on scroll — no fake 3D lean. */}
              <Reveal y={32} className={cn(i % 2 === 1 && 'lg:order-1')}>
                {mocks[i]}
              </Reveal>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function FitSection({ copy }: { copy: MarketingCopy }) {
  return (
    <div className="relative isolate overflow-hidden bg-stone-950">
      {/* Cinematic parallax backdrop — the pass during service, kept dim so the
          copy stays legible. Decorative; the section's words carry the meaning. */}
      <ParallaxImage
        src="/marketing/hero-pass.webp"
        alt=""
        className="absolute inset-0 -z-10"
        imgClassName="opacity-[0.22]"
        sizes="100vw"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-stone-950 via-stone-950/85 to-stone-950" />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <Reveal>
              <MonoTag dark>{copy.fit.metaLine}</MonoTag>
              <h2
                className={cn(
                  display,
                  'mt-4 text-3xl leading-[1.08] text-white sm:text-4xl md:text-5xl'
                )}
              >
                {copy.fit.heading}
              </h2>
            </Reveal>
            <Reveal className="mt-10 hidden max-w-md lg:block">
              <ParallaxImage
                src="/marketing/mena-table.webp"
                alt={copy.fit.imageAlt}
                className="aspect-[3/4] rounded-[10px] border border-stone-800"
                sizes="420px"
              />
            </Reveal>
          </div>
          <ul>
            {copy.fit.points.map((point, i) => (
              <li
                key={point.lead}
                className="border-t border-stone-800 first:border-t-0 first:pt-0 last:pb-0"
              >
                <Reveal delay={i * 0.04} className="py-5 leading-relaxed text-stone-400">
                  <strong className="font-semibold text-white">{point.lead}</strong> {point.body}
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </div>
  );
}

export function OutcomesSection({ copy }: { copy: MarketingCopy }) {
  const railRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mounted = useMounted();
  // The "week one" rail scrubs to scroll: empty when the block enters, full as
  // it leaves. Honest index energy — no invented metrics, just a filling week.
  const { scrollYProgress } = useScroll({ target: railRef, offset: ['start 90%', 'end 55%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  const animate = mounted && !reduce;

  return (
    <Section>
      <Reveal>
        <h2
          className={cn(
            display,
            'max-w-3xl text-3xl leading-[1.08] text-stone-950 sm:text-4xl md:text-5xl'
          )}
        >
          {copy.outcomes.heading}
        </h2>
      </Reveal>
      <div ref={railRef} className="relative mt-10">
        {/* Scroll-scrubbed progress rail; under reduced motion it sits fully drawn. */}
        <div aria-hidden="true" className="relative h-px w-full bg-stone-200">
          <motion.div
            style={animate ? { scaleX: fill } : undefined}
            className="absolute inset-0 h-px origin-left bg-emerald-600 rtl:origin-right"
          />
        </div>
        <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {copy.outcomes.items.map((item, i) => (
            <Reveal key={item.lead} delay={i * 0.04}>
              <div className="border-s-2 border-stone-950 ps-4">
                <span className="font-mono text-[13px] font-medium tabular-nums text-emerald-700">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 font-semibold leading-snug text-stone-950">{item.lead}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function FinalCtaSection({
  copy,
  whatsappHref,
}: {
  copy: MarketingCopy;
  whatsappHref: string;
}) {
  return (
    <div className="border-t border-stone-200">
      <Section id="contact">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2
            className={cn(display, 'text-3xl leading-[1.06] text-stone-950 sm:text-5xl md:text-6xl')}
          >
            {copy.contact.heading}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
            {copy.contact.body}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <PrimaryCta href={whatsappHref} large>
              <MessageCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              {copy.cta.startFreeTrial}
            </PrimaryCta>
            <p className="font-mono text-sm text-stone-500">
              {copy.footer.whatsappLabel}{' '}
              <span dir="ltr" className="text-stone-950">
                {WHATSAPP_DISPLAY}
              </span>
            </p>
          </div>
          <p className="mt-8 text-sm text-stone-500">{copy.contact.note}</p>
        </Reveal>
      </Section>
    </div>
  );
}
