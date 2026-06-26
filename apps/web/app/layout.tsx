import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/contexts/Providers';

export const metadata: Metadata = {
  title: 'CyberXscore - Cybersecurity Self-Assessment',
  description: 'Get a clear, actionable cybersecurity score for your business in minutes. No technical expertise required.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
