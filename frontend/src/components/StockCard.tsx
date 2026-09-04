import React from 'react';
import { Database, ShoppingBag, Store, AlertTriangle, CheckCircle } from 'lucide-react';

interface StockCardProps {
  channel: 'sae' | 'shopify' | 'mercadolibre';
  stock: number;
  expectedStock?: number;
}

export const StockCard: React.FC<StockCardProps> = ({ channel, stock, expectedStock }) => {
  const isSae = channel === 'sae';
  const isDesynced = expectedStock !== undefined && stock !== expectedStock;

  let title = 'CONTPAQi SAE';
  let Icon = Database;
  let iconColor = 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400';
  let borderColor = 'border-slate-200 dark:border-slate-800';

  if (channel === 'shopify') {
    title = 'Shopify';
    Icon = ShoppingBag;
    iconColor = 'text-green-600 bg-green-50 dark:bg-emerald-950/40 dark:text-emerald-400';
  } else if (channel === 'mercadolibre') {
    title = 'Mercado Libre';
    Icon = Store;
    iconColor = 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 dark:text-yellow-400';
  }

  if (isDesynced) {
    borderColor = 'border-rose-300 dark:border-rose-800 ring-1 ring-rose-300 dark:ring-rose-800/50';
  } else if (!isSae && expectedStock !== undefined) {
    borderColor = 'border-green-300 dark:border-emerald-800';
  }

  return (
    <div className={`p-5 rounded-xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between transition-all duration-200 ${borderColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-none">{title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{isSae ? 'Sistema Core (Física)' : 'Canal Digital'}</p>
          </div>
        </div>
        {!isSae && expectedStock !== undefined && (
          <div>
            {isDesynced ? (
              <span className="flex items-center gap-1 text-xs text-rose-500 dark:text-rose-400 font-medium">
                <AlertTriangle size={12} /> Desfasado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-green-500 dark:text-emerald-400 font-medium">
                <CheckCircle size={12} /> Sincronizado
              </span>
            )}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stock}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">unidades</span>
        </div>
        {!isSae && expectedStock !== undefined && isDesynced && (
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-2 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md font-medium border border-rose-200 dark:border-rose-900/50">
            Debería ser {expectedStock} (Dif: {stock - expectedStock > 0 ? `+${stock - expectedStock}` : stock - expectedStock})
          </p>
        )}
      </div>
    </div>
  );
};
export default StockCard;
