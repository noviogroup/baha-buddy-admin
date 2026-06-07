import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { AuthGate } from '@/components/auth-gate';

export const dynamic = 'force-dynamic';

// ─── Admin fonts ───────────────────────────────────────────────
// Inter keeps the admin panel clean, neutral, and product-grade.
// JetBrains Mono is reserved for IDs, refs, code, and technical values.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Baha Buddy Admin',
  description: 'Internal admin panel for Baha Buddy V2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        <AuthProvider>
          <AuthGate>
            {children}
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
