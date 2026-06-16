import type { Metadata } from 'next';
import { JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';

// InVū system: Manrope for UI/display, JetBrains Mono for numerals/amounts.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Consi · Pasarela de Pagos',
  description: 'B2B multi-currency (USD/VES) payment gateway for Venezuela',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
