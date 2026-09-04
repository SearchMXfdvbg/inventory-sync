import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let bgColor = 'bg-gray-100 text-gray-800';
  let label = status;

  switch (status.toUpperCase()) {
    case 'PENDING':
      bgColor = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      label = 'Pendiente';
      break;
    case 'PROCESSING':
      bgColor = 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse';
      label = 'Procesando';
      break;
    case 'PROCESSED':
      bgColor = 'bg-green-100 text-green-800 border border-green-200';
      label = 'Procesado';
      break;
    case 'FAILED':
      bgColor = 'bg-red-100 text-red-800 border border-red-200';
      label = 'Fallido';
      break;
    case 'MATCH':
      bgColor = 'bg-green-100 text-green-800 border border-green-200';
      label = 'Sincronizado';
      break;
    case 'DESYNC':
      bgColor = 'bg-rose-100 text-rose-800 border border-rose-200';
      label = 'Desincronizado';
      break;
    case 'HIGH':
      bgColor = 'bg-red-100 text-red-800 border border-red-200';
      label = 'Alta';
      break;
    case 'MEDIUM':
      bgColor = 'bg-amber-100 text-amber-800 border border-amber-200';
      label = 'Media';
      break;
    case 'LOW':
      bgColor = 'bg-blue-100 text-blue-800 border border-blue-200';
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
