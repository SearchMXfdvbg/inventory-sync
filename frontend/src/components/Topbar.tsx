'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Terminal, Activity } from 'lucide-react';
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
    <header className="h-14 border-b border-[#20242c] bg-[#0d0e12]/95 backdrop-blur flex items-center justify-between px-6 fixed right-0 top-0 left-64 z-10 font-mono-code text-xs">
      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="text-[#00ff66] font-bold">//</span>
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h2>
      </div>

      {/* Control panel */}
      <div className="flex items-center gap-4">

        {/* Botón exclusivo para CristAdmin */}
        {isSuperAdmin && (
          <Link
            href="/super-admin"
            className="flex items-center gap-1.5 px-3 py-1 bg-[#ff3b00]/10 hover:bg-[#ff3b00]/20 text-[#ff3b00] border border-[#ff3b00]/40 text-xs font-bold transition-all"
            title="Consola de Control Maestro Super Admin"
          >
            <ShieldCheck size={13} className="shrink-0" />
            <span>Panel Super Admin</span>
          </Link>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
};

export default Topbar;
