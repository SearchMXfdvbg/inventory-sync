'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import AccessGate from '@/components/AccessGate';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    role?: string;
    plan?: string;
    is_active?: boolean;
    suspension_reason?: string;
  } | null>(null);

  // Páginas independientes/públicas donde NUNCA debe mostrarse el Sidebar ni el Topbar estándar
  const cleanPath = (pathname || '').replace(/\/$/, '') || '/';
  const isPublicPage = Boolean(
    cleanPath === '/' ||
    cleanPath === '/login' ||
    cleanPath === '/register' ||
    cleanPath.startsWith('/login') ||
    cleanPath.startsWith('/register') ||
    cleanPath === '/super-admin' ||
    cleanPath.startsWith('/super-admin')
  );

  useEffect(() => {
    setMounted(true);

    // Sincronizar tema oscuro por defecto
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      if (!savedTheme) {
        localStorage.setItem('theme', 'dark');
      }
    }

    // Verificar si el usuario ha iniciado sesión en rutas protegidas
    const loggedIn = typeof window !== 'undefined' ? localStorage.getItem('logged_in') : null;
    const hasToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const isAuth = Boolean(loggedIn || hasToken);
    setIsAuthenticated(isAuth);

    if (isAuth) {
      try {
        const sessionRaw = localStorage.getItem('user_session');
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw);
          let userPlan = parsed.plan || 'Plan Guest';
          let userActive = parsed.is_active ?? true;
          let userReason = parsed.suspension_reason || '';

          // Consultar caché de tenants locales para datos en vivo
          const storedTenants = localStorage.getItem('inventory_sync_tenants_v2');
          if (storedTenants && parsed.username) {
            const tList = JSON.parse(storedTenants);
            const found = tList.find((t: any) => t.name?.toLowerCase() === parsed.username.toLowerCase());
            if (found) {
              userPlan = found.plan || userPlan;
              userActive = found.status === 'ACTIVE';
              userReason = found.suspension_reason || userReason;
            }
          }

          setCurrentUser({
            username: parsed.username || 'Cliente',
            role: parsed.role || 'CLIENT_ADMIN',
            plan: parsed.username?.toLowerCase() === 'cristadmin' ? 'Enterprise (39,000 SKUs)' : userPlan,
            is_active: parsed.username?.toLowerCase() === 'cristadmin' ? true : userActive,
            suspension_reason: userReason
          });
        }
      } catch {}
    }

    if (!isAuth && !isPublicPage) {
      router.replace('/login');
    }
  }, [pathname, router, isPublicPage]);

  // Polling en vivo para actualizar suspensiones y planes en tiempo real sin recargar
  useEffect(() => {
    let intervalId: any = null;

    const checkLiveStatus = async () => {
      if (typeof window === 'undefined') return;
      const sessionRaw = localStorage.getItem('user_session');
      if (!sessionRaw) return;

      try {
        const parsed = JSON.parse(sessionRaw);
        const username = parsed.username;
        if (!username || username.toLowerCase() === 'cristadmin') return;

        const res = await fetch('/api/super-admin/tenants');
        if (res.ok) {
          const tenants: any[] = await res.json();
          if (Array.isArray(tenants)) {
            const found = tenants.find((t: any) => t.name?.toLowerCase() === username.toLowerCase());
            if (found) {
              const isActive = found.status === 'ACTIVE';
              const plan = found.plan || 'Plan Guest';
              const reason = found.suspension_reason || '';

              // Actualizar estado reactivo
              setCurrentUser({
                username: found.name,
                role: 'CLIENT_ADMIN',
                plan: plan,
                is_active: isActive,
                suspension_reason: reason
              });

              // Sincronizar localStorage
              localStorage.setItem('user_session', JSON.stringify({
                ...parsed,
                plan: plan,
                is_active: isActive,
                suspension_reason: reason
              }));

              const stored = localStorage.getItem('inventory_sync_tenants_v2');
              let list = stored ? JSON.parse(stored) : [];
              const idx = list.findIndex((item: any) => item.name?.toLowerCase() === username.toLowerCase());
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...found };
              } else {
                list.push(found);
              }
              localStorage.setItem('inventory_sync_tenants_v2', JSON.stringify(list));
            }
          }
        }
      } catch {}
    };

    if (isAuthenticated && !isPublicPage) {
      checkLiveStatus();
      intervalId = setInterval(checkLiveStatus, 2000);
      window.addEventListener('focus', checkLiveStatus);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', checkLiveStatus);
      }
    };
  }, [isAuthenticated, isPublicPage]);

  let topbarTitle = 'Panel de Control';
  if (cleanPath.startsWith('/inventory/')) {
    topbarTitle = 'Detalle de Producto';
  } else if (cleanPath === '/catalog') {
    topbarTitle = 'Catálogo y Preparador TikTok';
  } else if (cleanPath === '/inventory') {
    topbarTitle = 'Catálogo de Inventario';
  } else if (cleanPath === '/sales') {
    topbarTitle = 'Historial de Transacciones';
  } else if (cleanPath === '/synchronization') {
    topbarTitle = 'Cola de Sincronización';
  } else if (cleanPath === '/reconciliation') {
    topbarTitle = 'Módulo de Conciliación';
  } else if (cleanPath === '/alerts') {
    topbarTitle = 'Centro de Alertas';
  } else if (cleanPath === '/settings/integrations') {
    topbarTitle = 'Configuración de Integraciones';
  }

  // El Sidebar y el Topbar SOLO se muestran si la página NO es pública Y el usuario está autenticado
  const showAppChrome = mounted && !isPublicPage && isAuthenticated;

  // Verificar si el usuario debe ser bloqueado por Plan Guest o Suspensión
  const isRestrictedClient = Boolean(
    currentUser &&
    currentUser.username.toLowerCase() !== 'cristadmin' &&
    currentUser.role !== 'SUPER_ADMIN' &&
    (currentUser.is_active === false || currentUser.plan === 'Plan Guest' || currentUser.plan?.toLowerCase().includes('guest'))
  );

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 transition-colors" suppressHydrationWarning>
        {isPublicPage ? (
          <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
            {children}
          </main>
        ) : !mounted ? (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : !isAuthenticated ? (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : isRestrictedClient ? (
          <AccessGate user={currentUser!} onRefresh={() => setMounted(false)} />
        ) : (
          <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
            <Sidebar />

            <div className="flex-1 flex flex-col pl-64 bg-slate-50 dark:bg-slate-950 min-h-screen">
              <Topbar title={topbarTitle} />

              <main className="flex-1 p-8 pt-24 min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
