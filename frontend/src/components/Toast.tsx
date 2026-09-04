import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  let icon = <Info size={18} className="text-blue-500" />;
  let bgColor = 'bg-blue-50 border-blue-200';

  if (type === 'success') {
    icon = <CheckCircle size={18} className="text-green-500" />;
    bgColor = 'bg-green-50 border-green-200';
  } else if (type === 'error') {
    icon = <AlertCircle size={18} className="text-red-500" />;
    bgColor = 'bg-red-50 border-red-200';
  } else if (type === 'warning') {
    icon = <AlertTriangle size={18} className="text-amber-500" />;
    bgColor = 'bg-amber-50 border-amber-200';
  }

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border shadow-md max-w-sm w-full transition-all duration-300 ${bgColor}`}>
      <div>{icon}</div>
      <div className="flex-1 text-sm font-medium text-slate-800">{message}</div>
      <button 
        onClick={() => onClose(id)} 
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
