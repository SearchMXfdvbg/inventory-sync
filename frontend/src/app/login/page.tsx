'use client';

import React, { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#090a0c] bg-grid-tech flex items-center justify-center p-4 selection:bg-[#00ff66] selection:text-black">
      <Suspense fallback={<div className="font-mono-code text-[#8e95a5] text-xs">Cargando consola de operador...</div>}>
        <AuthForm defaultMode="login" />
      </Suspense>
    </div>
  );
}
