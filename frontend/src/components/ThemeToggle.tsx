'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    } else {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new Event('theme-change'));
  };

  if (!mounted) {
    return (
      <div className={`w-8 h-8 rounded-none border border-[#20242c] bg-[#14171e] ${className}`} />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Cambiar a modo claro (Día)' : 'Cambiar a modo oscuro (Noche)'}
      className={`p-2 transition-all flex items-center justify-center cursor-pointer border ${
        theme === 'dark'
          ? 'bg-[#14171e] hover:bg-[#1a1e27] text-amber-400 border-[#20242c] shadow-hard'
          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
      } ${className}`}
      aria-label="Cambiar tema"
    >
      {theme === 'dark' ? (
        <Sun size={15} className="text-amber-400" />
      ) : (
        <Moon size={15} className="text-slate-700" />
      )}
    </button>
  );
}
