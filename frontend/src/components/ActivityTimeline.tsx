import React from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Venta } from '@/lib/api';

interface ActivityTimelineProps {
  venta: Venta;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ venta }) => {
  const steps = [
    {
      title: `Venta Registrada (${venta.origen === 'shopify' ? 'Shopify' : 'Mercado Libre'})`,
      desc: `ID Externo: ${venta.external_id}`,
      done: true,
      active: false,
      failed: false,
    },
    {
      title: 'Decremento de Stock en SAE',
      desc: venta.sae_decremented 
        ? `Descontado SKU ${venta.sku} x${venta.cantidad} de SAE` 
        : venta.status === 'PROCESSING' && !venta.sae_decremented ? 'Descontando stock...' : 'En cola de espera',
      done: venta.sae_decremented,
      active: venta.status === 'PROCESSING' && !venta.sae_decremented,
      failed: venta.status === 'FAILED' && !venta.sae_decremented,
    },
    {
      title: 'Sincronización en Shopify',
      desc: venta.shopify_synced 
        ? 'Inventario actualizado exitosamente' 
        : venta.status === 'PROCESSING' && venta.sae_decremented && !venta.shopify_synced ? 'Sincronizando Shopify...' : 'Pendiente',
      done: venta.shopify_synced,
      active: venta.status === 'PROCESSING' && venta.sae_decremented && !venta.shopify_synced,
      failed: venta.status === 'FAILED' && venta.sae_decremented && !venta.shopify_synced,
    },
    {
      title: 'Sincronización en Mercado Libre',
      desc: venta.ml_synced 
        ? 'Inventario actualizado exitosamente' 
        : venta.status === 'PROCESSING' && venta.shopify_synced && !venta.ml_synced ? 'Sincronizando Mercado Libre...' : 'Pendiente',
      done: venta.ml_synced,
      active: venta.status === 'PROCESSING' && venta.shopify_synced && !venta.ml_synced,
      failed: venta.status === 'FAILED' && venta.shopify_synced && !venta.ml_synced,
    }
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-slate-800">Flujo de Sincronización Saga</h3>
          <p className="text-xs text-slate-400 mt-1">Transacciones automáticas en dos fases</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">Intentos: {venta.attempts}/5</span>
        </div>
      </div>

      <div className="relative border-l border-slate-100 ml-4 space-y-8 pb-2">
        {steps.map((step, idx) => {
          let badge = (
            <div key={idx} className="absolute -left-[17px] w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border-4 border-white shadow-sm">
              <span className="text-xs font-semibold">{idx + 1}</span>
            </div>
          );

          if (step.done) {
            badge = (
              <div key={idx} className="absolute -left-[17px] w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center border-4 border-white shadow-sm">
                <Check size={14} className="stroke-[3]" />
              </div>
            );
          } else if (step.active) {
            badge = (
              <div key={idx} className="absolute -left-[17px] w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center border-4 border-white shadow-sm animate-pulse">
                <Loader2 size={14} className="animate-spin" />
              </div>
            );
          } else if (step.failed) {
            badge = (
              <div key={idx} className="absolute -left-[17px] w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center border-4 border-white shadow-sm">
                <X size={14} />
              </div>
            );
          }

          return (
            <div key={idx} className="relative pl-8">
              {badge}
              <div>
                <h4 className={`text-sm font-semibold leading-none ${step.done ? 'text-slate-800' : step.active ? 'text-blue-600' : step.failed ? 'text-red-600' : 'text-slate-400'}`}>
                  {step.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {venta.status === 'FAILED' && venta.last_error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
          <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">Error de Ejecución:</h4>
          <p className="text-xs text-red-600 mt-1 leading-relaxed font-mono">{venta.last_error}</p>
        </div>
      )}
    </div>
  );
};

export default ActivityTimeline;
