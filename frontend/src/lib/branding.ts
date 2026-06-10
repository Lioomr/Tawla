import { RestaurantBranding } from './api';

// Neutral white-label fallbacks used whenever a restaurant has not configured
// branding. Deliberately product-agnostic: never surface "Tawlax" to customers.
export const DEFAULT_BRAND = {
  name: 'Restaurant',
  tagline: 'Order right from your table.',
  primaryColor: '#18181b',
  secondaryColor: '#f4f4f5',
  accentColor: '#C8963E',
} as const;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Arabic, Arabic Supplement, Extended-A, and Presentation Forms-A/B ranges.
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function containsArabic(text?: string | null): boolean {
  return !!text && ARABIC_RE.test(text);
}

export function getTextDir(text?: string | null): 'rtl' | 'ltr' {
  return containsArabic(text) ? 'rtl' : 'ltr';
}

export function getDirForTexts(...texts: Array<string | null | undefined>): 'rtl' | 'ltr' {
  return texts.some(containsArabic) ? 'rtl' : 'ltr';
}

export function isValidHex(color?: string | null): color is string {
  return !!color && HEX_RE.test(color);
}

export function getReadableTextColor(hex: string): string {
  const channel = (start: number) => parseInt(hex.slice(start, start + 2), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance =
    0.2126 * toLinear(channel(1)) +
    0.7152 * toLinear(channel(3)) +
    0.0722 * toLinear(channel(5));
  return luminance > 0.5 ? '#18181b' : '#ffffff';
}

export interface BrandVars {
  primary: string;
  secondary: string;
  accent: string;
  onPrimary: string;
  onSecondary: string;
  onAccent: string;
}

export function resolveBrandVars(branding?: RestaurantBranding | null): BrandVars {
  const primary = isValidHex(branding?.primary_color)
    ? (branding!.primary_color as string)
    : DEFAULT_BRAND.primaryColor;
  const secondary = isValidHex(branding?.secondary_color)
    ? (branding!.secondary_color as string)
    : DEFAULT_BRAND.secondaryColor;
  const accent = DEFAULT_BRAND.accentColor;

  return {
    primary,
    secondary,
    accent,
    onPrimary: getReadableTextColor(primary),
    onSecondary: getReadableTextColor(secondary),
    onAccent: getReadableTextColor(accent),
  };
}

export function brandName(branding?: RestaurantBranding | null): string {
  return branding?.name?.trim() || DEFAULT_BRAND.name;
}
