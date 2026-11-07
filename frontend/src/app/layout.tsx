import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { BookOpen, Sparkles, LayoutDashboard, BrainCircuit, GraduationCap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Learnability Pro - Multimodal AI Learning Platform',
  description: 'AI-Powered Interactive Tutor, Flashcards, and Concept Mindmaps with Spring AI & Supabase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col font-sans">
        <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-xl text-white">
              <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-500/20">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                Learnability<span className="text-indigo-400 font-extrabold ml-1">Pro</span>
              </span>
            </Link>

            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                Dashboard
              </Link>
              <Link
                href="/dashboard?tab=LEARN"
                className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
              >
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Tutor
              </Link>
              <Link
                href="/dashboard?tab=FLASHCARD"
                className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
              >
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                Flashcards
              </Link>
              <Link
                href="/dashboard?tab=DIAGRAM"
                className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Mindmaps
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
