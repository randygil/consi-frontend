import type { Metadata } from 'next';

/**
 * Hosted checkout surface. Payment links get pasted into WhatsApp, email and
 * Telegram, all of which hand URLs to crawlers — so this subtree is explicitly
 * un-indexable. `nocache` and `nosnippet` keep the amount and the merchant name
 * out of search previews even where a crawler ignores `noindex`.
 *
 * The title is set here too: inheriting the root's "Consi · Pasarela de Pagos"
 * told the payer nothing about what they were looking at.
 */
export const metadata: Metadata = {
  title: 'Pagar · Consi',
  description: 'Completa tu pago de forma segura.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true, nosnippet: true },
  },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
