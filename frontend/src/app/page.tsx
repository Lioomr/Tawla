import type { Metadata } from 'next';
import { Archivo, Geist_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { MarketingSite } from '@/components/marketing/MarketingSite';

// Display face: Archivo variable, used wide (font-stretch 125%) and heavy for
// headlines only. Signage DNA — confident, operational, not a default stack.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-display-latin',
  display: 'swap',
});

// Utility face for the operational layer: timestamps, table codes, statuses.
// The receipt/ticket vernacular of the restaurant world.
const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-marketing-mono',
  display: 'swap',
});

// Arabic-capable face; Geist (the app default) only covers Latin. Also serves
// as the Arabic display face since Archivo has no Arabic glyphs.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tawlax — Restaurant Operating System | نظام تشغيل المطاعم',
  description:
    'Tawlax is a real-time Restaurant Operating System for Egypt & MENA. QR/NFC table ordering, live kitchen display, waiter coordination, and owner dashboards. — نظام تشغيل مطاعم يعمل في الوقت الفعلي: طلب من الطاولة عبر QR وNFC وشاشة مطبخ حيّة.',
  openGraph: {
    title: 'Tawlax — Restaurant Operating System',
    description:
      'QR/NFC table ordering, live kitchen display, waiter coordination, and owner dashboards. Built for Egypt & MENA service.',
    type: 'website',
    images: [{ url: '/marketing/og.png', width: 1200, height: 630, alt: 'tawlax — the restaurant operating system' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/marketing/og.png'],
  },
};

export default function Home() {
  return (
    <MarketingSite
      fontClasses={`${archivo.variable} ${geistMono.variable} ${plexArabic.variable}`}
    />
  );
}
