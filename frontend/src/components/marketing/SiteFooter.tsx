'use client';

import type { MarketingCopy } from './copy';
import { WHATSAPP_DISPLAY } from './copy';
import { TawlaxLogo } from './shared';

export function SiteFooter({
  copy,
  whatsappHref,
}: {
  copy: MarketingCopy;
  whatsappHref: string;
}) {
  const year = new Date().getFullYear();
  const nav = [
    { href: '#problem', label: copy.nav.problem },
    { href: '#how', label: copy.nav.how },
    { href: '#product', label: copy.nav.product },
  ];

  return (
    <footer className="border-t border-stone-200">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <TawlaxLogo />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-600">
              {copy.footer.description}
            </p>
          </div>
          <nav aria-label={copy.footer.productTitle}>
            <p className="text-sm font-semibold text-stone-950">{copy.footer.productTitle}</p>
            <ul className="mt-4 space-y-2.5">
              {nav.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-stone-600 transition-colors hover:text-stone-950"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="text-sm font-semibold text-stone-950">{copy.footer.contactTitle}</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-stone-600 transition-colors hover:text-stone-950"
                >
                  {copy.footer.whatsappLabel}
                </a>
              </li>
              <li>
                {/* TODO: Replace with the real Tawlax WhatsApp number. */}
                <span dir="ltr" className="font-mono text-sm text-stone-500">
                  {WHATSAPP_DISPLAY}
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-stone-200 pt-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <span dir="ltr">{year}</span> Tawlax. {copy.footer.rights}
          </p>
          <p>{copy.footer.madeFor}</p>
        </div>
      </div>
    </footer>
  );
}
