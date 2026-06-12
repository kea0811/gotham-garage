import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SwRegister } from '@/components/ui/SwRegister';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Pitstop', template: '%s — Pitstop' },
  description:
    'Phone-first catalog for diecast collectors. Scan barcodes, match loose cars by photo, and browse your collection anywhere — even offline.',
  applicationName: 'Pitstop',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Pitstop' },
};

export const viewport: Viewport = {
  themeColor: '#07070c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
