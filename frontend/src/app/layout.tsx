'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

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

    if (!isAuth && !isPublicPage) {
      router.replace('/login');
    }
  }, [pathname, router, isPublicPage]);

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

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 transition-colors" suppressHydrationWarning>
        {showAppChrome ? (
          <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
            <Sidebar />

            <div className="flex-1 flex flex-col pl-64 bg-slate-50 dark:bg-slate-950 min-h-screen">
              <Topbar title={topbarTitle} />

              <main className="flex-1 p-8 pt-24 min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
                {children}
              </main>
            </div>
          </div>
        ) : (
          <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
