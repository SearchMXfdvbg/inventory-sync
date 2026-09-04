'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Sparkles } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface TopbarProps {
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('user_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.username?.toLowerCase() === 'cristadmin' || parsed.role === 'SUPER_ADMIN') {
            setIsSuperAdmin(true);
            return;
          }
        } catch {}
      }
      const username = localStorage.getItem('username');
      if (username?.toLowerCase() === 'cristadmin') {
        setIsSuperAdmin(true);
      }
    }
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 fixed right-0 top-0 left-64 z-10 transition-colors">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{title}</h2>
      </div>

      {/* Control panel */}
      <div className="flex items-center gap-3">
        {/* Botón exclusivo para CristAdmin */}
        {isSuperAdmin && (
          <Link
            href="/super-admin"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white text-xs font-black shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all cursor-pointer border border-amber-300/40 active:scale-95"
            title="Consola de Control Maestro Super Admin"
          >
            <ShieldCheck size={15} className="text-amber-200 shrink-0" />
            <span>Panel Super Admin</span>
            <Sparkles size={13} className="text-amber-200 animate-pulse shrink-0" />
          </Link>
        )}

        {/* Sol / Luna para cambiar de tema */}
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Topbar;

