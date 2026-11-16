import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Med Invent Devices — Customer Pricing & Ordering Calculator',
  description:
    'Calculate exact GST-inclusive customer rates, pack tiers, and promo combos for B-HEX® Pupil Expanders, B-OCTA 8.00, and B-HEX® 23G Forceps, and send itemized order requests on WhatsApp.',
  openGraph: {
    title: 'Med Invent Devices — Customer Pricing & Ordering Calculator',
    description:
      'Mobile-friendly ophthalmic device pricing & WhatsApp order request calculator by Med Invent Devices Pvt Ltd.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Med Invent Devices — Customer Pricing & Ordering Calculator',
    description:
      'Calculate exact customer rates incl. GST & free shipping across India and send itemized order requests on WhatsApp.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-[#1D4ED8]/15 selection:text-[#1E3A8A]"
      >
        {children}
      </body>
    </html>
  );
}
