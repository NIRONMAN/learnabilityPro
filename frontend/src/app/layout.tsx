import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SanctuaryHeader } from '@/components/SanctuaryHeader';
import { GlobalCommandPalette } from '@/components/GlobalCommandPalette';

export const metadata: Metadata = {
  title: 'Learnability Pro · Academic Research Studio',
  description:
    'Disciplined research workbench for complex scientific literature. Multi-pane studio, split-screen reading, verified mathematical provenance, and keyboard-first AI interrogation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="min-h-screen bg-canvas text-ink-body font-sans antialiased flex flex-col selection:bg-wash-highlight selection:text-ink-primary">
        <ThemeProvider>
          <SanctuaryHeader />
          <GlobalCommandPalette />
          <main className="flex-1 flex flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
