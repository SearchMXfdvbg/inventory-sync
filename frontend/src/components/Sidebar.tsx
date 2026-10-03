'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  RefreshCw, 
  Bell, 
  GitCompare, 
  Settings, 
  LogOut,
  User,
  LifeBuoy,
  ShieldCheck,
  Terminal,
  Cpu,
  Zap
} from 'lucide-react';
import { clearSession } from '@/lib/api';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState('Operador');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('user_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.username) {
            setCurrentUser(parsed.username);
            return;
          }
        } catch {}
      }
      const user = localStorage.getItem('username');
      if (user) setCurrentUser(user);
    }
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Inventario', path: '/inventory', icon: Package },
    { name: 'Ventas', path: '/sales', icon: ShoppingCart },
    { name: 'Sincronización', path: '/synchronization', icon: RefreshCw },
    { name: 'Conciliación', path: '/reconciliation', icon: GitCompare },
    { name: 'Alertas', path: '/alerts', icon: Bell },
    { name: 'Tickets de Soporte', path: '/tickets', icon: LifeBuoy },
    { name: 'Configuración', path: '/settings/integrations', icon: Settings },
  ];

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-white dark:bg-[#0d0e12] text-slate-800 dark:text-[#ededed] flex flex-col justify-between border-r border-slate-200 dark:border-[#20242c] h-screen fixed left-0 top-0 z-20 font-mono-code text-xs transition-colors duration-200">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#20242c] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00ff66] text-black font-bold flex items-center justify-center text-sm shadow-hard">
            //
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight leading-none">INVENTORY_SYNC</h1>
            <p className="text-[10px] text-slate-500 dark:text-[#8e95a5] mt-1 tracking-wider uppercase">Saga Distributed Core</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {currentUser.toLowerCase() === 'cristadmin' && (
            <Link
              href="/super-admin"
              className={`flex items-center justify-between gap-3 px-3 py-2 text-xs font-bold border border-[#ff3b00]/40 transition-all mb-3 ${
                pathname === '/super-admin' 
                  ? 'bg-[#ff3b00] text-black shadow-hard' 
                  : 'bg-[#ff3b00]/10 text-[#d93200] dark:text-[#ff3b00] hover:bg-[#ff3b00]/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="shrink-0" />
                <span>Panel Super Admin</span>
              </div>
              <span className="text-[9px] px-1 py-0.2 border border-current uppercase">
                MASTER
              </span>
            </Link>
          )}

          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            const isHighlight = (item as { highlight?: boolean }).highlight;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 transition-all ${
                  isHighlight && !isActive
                    ? 'text-indigo-400 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border-l-2 border-indigo-500 font-semibold'
                    : isActive
                    ? 'bg-slate-100 dark:bg-[#181b22] text-[#008f39] dark:text-[#00ff66] border-l-2 border-[#008f39] dark:border-[#00ff66] font-bold'
                    : 'text-slate-600 dark:text-[#8e95a5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#14171e]'
                }`}
              >
                <Icon size={16} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Section with Operator Status */}
      <div className="p-4 border-t border-slate-200 dark:border-[#20242c] bg-slate-50 dark:bg-[#090a0c] space-y-3 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 flex items-center justify-center font-bold text-xs shrink-0 border ${
              currentUser.toLowerCase() === 'cristadmin'
                ? 'border-[#ff3b00] bg-[#ff3b00]/20 text-[#ff3b00]'
                : 'border-[#00ff66] bg-[#00ff66]/20 text-emerald-700 dark:text-[#00ff66]'
            }`}>
              {currentUser.charAt(0).toUpperCase()}
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{currentUser}</p>
              <p className="text-[10px] text-slate-500 dark:text-[#555d6e]">
                {currentUser.toLowerCase() === 'cristadmin' ? 'SUPER_OPERADOR' : 'OPERADOR_CLIENTE'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            title="Desconectar consola"
            className="p-1.5 border border-slate-300 dark:border-[#20242c] hover:border-[#ff3b00] text-slate-500 dark:text-[#8e95a5] hover:text-[#ff3b00] transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
