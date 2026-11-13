'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'blueprint' | 'obsidian';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'obsidian',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('obsidian');

  useEffect(() => {
    const saved = localStorage.getItem('lp_theme') as Theme | null;
    if (saved === 'obsidian' || saved === 'blueprint') {
      setThemeState(saved);
      if (saved === 'obsidian') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Default is Obsidian (cybernetic canvas)
      setThemeState('obsidian');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('lp_theme', newTheme);
    if (newTheme === 'obsidian') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'obsidian' ? 'blueprint' : 'obsidian');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
