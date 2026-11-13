'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'obsidian' | 'aurora' | 'blueprint';

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

  const applyThemeClasses = (t: Theme) => {
    if (t === 'obsidian') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('theme-aurora');
    } else if (t === 'aurora') {
      document.documentElement.classList.add('dark', 'theme-aurora');
    } else {
      document.documentElement.classList.remove('dark', 'theme-aurora');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('lp_theme') as Theme | null;
    if (saved === 'obsidian' || saved === 'aurora' || saved === 'blueprint') {
      setThemeState(saved);
      applyThemeClasses(saved);
    } else {
      setThemeState('obsidian');
      applyThemeClasses('obsidian');
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('lp_theme', newTheme);
    applyThemeClasses(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((curr) => {
      const nextTheme: Theme =
        curr === 'obsidian' ? 'aurora' : curr === 'aurora' ? 'blueprint' : 'obsidian';
      localStorage.setItem('lp_theme', nextTheme);
      applyThemeClasses(nextTheme);
      return nextTheme;
    });
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
