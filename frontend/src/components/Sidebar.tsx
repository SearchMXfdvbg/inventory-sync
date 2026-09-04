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
  Sparkles
} from 'lucide-react';
import { clearSession } from '@/lib/api';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState('Administrador');

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
    { name: 'Catálogo / TikTok', path: '/catalog', icon: Sparkles },
    { name: 'Inventario', path: '/inventory', icon: Package },
    { name: 'Ventas', path: '/sales', icon: ShoppingCart },
    { name: 'Sincronización', path: '/synchronization', icon: RefreshCw },
    { name: 'Conciliación', path: '/reconciliation', icon: GitCompare },
    { name: 'Alertas', path: '/alerts', icon: Bell },
    { name: 'Configuración', path: '/settings/integrations', icon: Settings },
  ];

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 h-screen fixed left-0 top-0 z-20">
      <div>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            IS
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-none">InventorySync</h1>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold tracking-wider uppercase">Saga Pattern Sync</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          {currentUser.toLowerCase() === 'cristadmin' && (
            <Link
              href="/super-admin"
              className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all mb-3 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/40 hover:border-amber-400 shadow-md ${
                pathname === '/super-admin' ? 'bg-amber-500 text-slate-950 font-black' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-amber-400 shrink-0" />
                <span>Panel Super Admin</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/40 uppercase font-black tracking-wider">
                Master
              </span>
            </Link>
          )}

          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              currentUser.toLowerCase() === 'cristadmin'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                : 'bg-blue-600/20 text-blue-400'
            }`}>
              {currentUser.charAt(0).toUpperCase()}
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-xs font-semibold text-white truncate max-w-[120px]">{currentUser}</p>
              <p className="text-[9px] text-slate-500 font-medium">
                {currentUser.toLowerCase() === 'cristadmin' ? 'Super Administrador' : 'Propietario / Admin'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
