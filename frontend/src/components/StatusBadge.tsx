import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let styleClasses = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let label = status;

  switch (status.toUpperCase()) {
    case 'PENDING':
      styleClasses = 'bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-700/60';
      label = 'PENDIENTE';
      break;
    case 'PROCESSING':
      styleClasses = 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/60 animate-pulse';
      label = 'PROCESANDO';
      break;
    case 'PROCESSED':
      styleClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-[#00ff66]/10 dark:text-[#00ff66] dark:border-[#00ff66]/40';
      label = 'CONFIRMADO';
      break;
    case 'FAILED':
    case 'ERROR':
      styleClasses = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-[#ff3b00]/10 dark:text-[#ff3b00] dark:border-[#ff3b00]/50';
      label = 'ERROR_SYNC';
      break;
    case 'CONFLICT':
      styleClasses = 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700';
      label = 'CONFLICTO_CAS';
      break;
    case 'RESERVED':
      styleClasses = 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700';
      label = 'STOCK_BLOQUEADO';
      break;
    case 'CRITICAL_STOCK':
      styleClasses = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-[#ff3b00]/10 dark:text-[#ff3b00] dark:border-[#ff3b00]/50 animate-pulse';
      label = 'STOCK_CRÍTICO (<5)';
      break;
    case 'LOW_STOCK':
      styleClasses = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700';
      label = 'STOCK_BAJO (<15)';
      break;
    case 'HEALTHY_STOCK':
    case 'MATCH':
      styleClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-[#00ff66]/10 dark:text-[#00ff66] dark:border-[#00ff66]/40';
      label = 'SINCRONIZADO';
      break;
    case 'DESYNC':
      styleClasses = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-[#ff3b00]/10 dark:text-[#ff3b00] dark:border-[#ff3b00]/50';
      label = 'DESFASADO';
      break;
    case 'LOCAL_ONLY':
    case 'SOLO_LOCAL':
    case 'UNLINKED':
      styleClasses = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
      label = 'ALMACÉN_LOCAL';
      break;
    case 'DISCONNECTED':
      styleClasses = 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800';
      label = 'DESCONECTADO';
      break;
    case 'HIGH':
      styleClasses = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-[#ff3b00]/10 dark:text-[#ff3b00] dark:border-[#ff3b00]/50';
      label = 'ALTA';
      break;
    case 'MEDIUM':
      styleClasses = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700';
      label = 'MEDIA';
      break;
    case 'LOW':
      styleClasses = 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700';
      label = 'BAJA';
      break;
  }

  return (
    <span className={`inline-block border px-2 py-0.5 font-mono-code text-[10px] font-bold tracking-wider rounded-none uppercase ${styleClasses}`}>
      {label}
    </span>
  );
};
export default StatusBadge;
