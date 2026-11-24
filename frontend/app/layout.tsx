import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Inter } from 'next/font/google';
import './globals.css';
import { PwaManager } from './components/PwaManager';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'S.I.U · Torreón Alerta — Sistema de Incidencias Urbanas',
  description:
    'Plataforma municipal de reportes ciudadanos e incidencias urbanas en tiempo real para SIMAS, La Ola y Obras Públicas.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0e315a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f3f6fa] text-[#172b43]">
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
