import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let bgColor = 'bg-gray-100 text-gray-800';
  let label = status;

  switch (status.toUpperCase()) {
    case 'PENDING':
      bgColor = 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/60';
      label = 'Pendiente';
      break;
    case 'PROCESSING':
      bgColor = 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 animate-pulse';
      label = 'Procesando';
      break;
    case 'PROCESSED':
      bgColor = 'bg-green-100 text-green-800 border border-green-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      label = 'Procesado';
      break;
    case 'FAILED':
      bgColor = 'bg-red-100 text-red-800 border border-red-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
      label = 'Fallido';
      break;
    case 'MATCH':
      bgColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      label = 'Sincronizado';
      break;
    case 'DESYNC':
      bgColor = 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
      label = 'Desincronizado';
      break;
    case 'LOCAL_ONLY':
    case 'SOLO_LOCAL':
    case 'UNLINKED':
      bgColor = 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700';
      label = 'Almacén Local';
      break;
    case 'DISCONNECTED':
      bgColor = 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/60';
      label = 'Desconectado';
      break;
    case 'HIGH':
      bgColor = 'bg-red-100 text-red-800 border border-red-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
      label = 'Alta';
      break;
    case 'MEDIUM':
      bgColor = 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      label = 'Media';
      break;
    case 'LOW':
      bgColor = 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
      label = 'Baja';
      break;
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${bgColor}`}>
      {label}
    </span>
  );
};
export default StatusBadge;
