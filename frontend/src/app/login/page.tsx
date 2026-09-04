'use client';

import React, { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-sm">Cargando...</div>}>
        <AuthForm defaultMode="login" />
      </Suspense>
    </div>
  );
}
