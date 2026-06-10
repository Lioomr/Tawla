'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useBrandingStore } from '@/store/useBrandingStore';
import { resolveBrandVars } from '@/lib/branding';

// Applies the active restaurant branding as CSS variables on the document root
// so customer-facing surfaces can theme themselves via var(--brand-*).
// Reads from the persisted branding store; falls back to neutral defaults.
export function useBrandTheme() {
  const branding = useBrandingStore((s) => s.branding);

  useEffect(() => {
    const root = document.documentElement;
    const vars = resolveBrandVars(branding);
    root.style.setProperty('--brand-primary', vars.primary);
    root.style.setProperty('--brand-secondary', vars.secondary);
    root.style.setProperty('--brand-accent', vars.accent);
    root.style.setProperty('--brand-on-primary', vars.onPrimary);
    root.style.setProperty('--brand-on-secondary', vars.onSecondary);
    root.style.setProperty('--brand-on-accent', vars.onAccent);
  }, [branding]);
}

// Returns persisted branding, but only after client mount. During SSR and the
// first hydration render it returns null so server/client markup match; the
// real branding appears on the next render. Use for branding-dependent text.
export function useHydratedBranding() {
  const branding = useBrandingStore((s) => s.branding);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return mounted ? branding : null;
}
