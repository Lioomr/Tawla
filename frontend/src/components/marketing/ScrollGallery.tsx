'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MarketingCopy } from './copy';
import {
  AdminDashboardMock,
  CustomerMenuMock,
  KitchenBoardMock,
  WaiterBoardMock,
} from './mockups';
import { display, MonoTag } from './shared';

/**
 * Desktop-only signature: the four product surfaces ride a horizontal track that
 * scrubs sideways as you scroll a tall pinned wrapper. Each screen *dwells* at
 * centre before the next slides in (the transform holds at each panel, like the
 * stepped travel in `ScrollNarrative`), so it reads as four deliberate beats
 * rather than a constant slide. RTL flips the travel direction.
 *
 * Only ever mounted by `SurfacesSection` once the viewport is wide and motion is
 * allowed; under reduced motion / small screens that section renders a static
 * vertical fallback, so this file needs no guards of its own.
 */
export function ScrollGallery({
  copy,
  dir,
}: {
  copy: MarketingCopy;
  dir: 'ltr' | 'rtl';
}) {
  const roles = copy.surfaces.roles;
  const mocks: ReactNode[] = [
    <CustomerMenuMock key="customer" copy={copy} className="origin-center scale-90 xl:scale-100" />,
    <KitchenBoardMock key="kitchen" copy={copy} className="mk-elevate w-full max-w-[480px]" />,
    <WaiterBoardMock key="waiter" copy={copy} className="mk-elevate w-full max-w-[400px]" />,
    <AdminDashboardMock key="admin" copy={copy} className="mk-elevate h-[250px] w-full max-w-[480px]" />,
  ];
  const n = roles.length;

  const wrapRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActive(Math.min(n - 1, Math.max(0, Math.round(v * (n - 1)))));
  });

  // Stepped travel: hold each panel at centre (±hold) then ease to the next.
  // Sign of `per` flips the direction for RTL so screens advance with reading.
  const per = (dir === 'rtl' ? 1 : -1) * 100; // vw moved per panel
  const hold = 0.055;
  const stops: number[] = [];
  const outs: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = n === 1 ? 0 : i / (n - 1);
    stops.push(Math.max(0, c - hold), Math.min(1, c + hold));
    outs.push(`${i * per}vw`, `${i * per}vw`);
  }
  const x = useSpring(useTransform(scrollYProgress, stops, outs), {
    stiffness: 90,
    damping: 26,
    mass: 0.4,
  });

  return (
    <section id="product" className="border-t border-stone-200">
      <div ref={wrapRef} style={{ height: `${n * 100}vh` }} className="relative">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div className="flex h-full flex-col justify-center gap-9 py-24">
            <div className="mx-auto flex w-full max-w-6xl shrink-0 items-end justify-between gap-6 px-8">
              <h2 className={cn(display, 'max-w-2xl text-3xl leading-[1.08] text-stone-950 lg:text-4xl')}>
                {copy.surfaces.heading}
              </h2>
              {/* Which screen is on stage. */}
              <div className="flex shrink-0 items-center gap-2 pb-2" aria-hidden="true">
                {roles.map((_, i) => (
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

            <div className="relative overflow-hidden">
              <motion.div style={{ x }} className="flex">
                {roles.map((role, i) => (
                  <div key={role.tag} className="w-screen shrink-0 px-8">
                    <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
                      <div>
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
                      </div>
                      <div className="flex justify-center">{mocks[i]}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
