'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Terminal, 
  Cpu, 
  ShieldAlert, 
  ArrowUpRight, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Activity, 
  Server, 
  GitBranch, 
  Lock, 
  Layers, 
  Zap, 
  DollarSign, 
  ChevronRight, 
  Copy, 
  CheckCheck,
  Code2,
  Database,
  ArrowRight
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  source: 'WEBHOOK' | 'SAGA' | 'SHOPIFY' | 'ML' | 'AMAZON';
  message: string;
  status: 'info' | 'success' | 'warn' | 'error';
}

export default function LandingPage() {
  // Simulador de eventos de inventario
  const [stock, setStock] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: '14:20:01.102',
      source: 'SAGA',
      message: 'Worker orquestador iniciado. Monitoreando SKU: SONY-WH1000XM5-BLK (Stock maestro: 1 unidad)',
      status: 'info'
    },
    {
      id: 'init-2',
      timestamp: '14:20:01.120',
      source: 'SHOPIFY',
      message: 'Canal sincronizado. Location ID: gid://shopify/Location/9812401',
      status: 'success'
    },
    {
      id: 'init-3',
      timestamp: '14:20:01.155',
      source: 'ML',
      message: 'Canal sincronizado. Item ID: MLM291823018 (Status: Activo)',
      status: 'success'
    }
  ]);

  // Calculadora de pérdidas por sobreventa
  const [monthlyOrders, setMonthlyOrders] = useState<number>(350);
  const [averageTicket, setAverageTicket] = useState<number>(850);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [activePayloadTab, setActivePayloadTab] = useState<'saga' | 'shopify' | 'ml'>('saga');

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Simulación de disparo de venta simultánea
  const triggerSaleSimulation = (channel: 'MERCADO_LIBRE' | 'SHOPIFY' | 'RACE_CONDITION') => {
    if (isProcessing) return;
    setIsProcessing(true);

    const now = () => {
      const d = new Date();
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
    };

    if (channel === 'RACE_CONDITION') {
      const newLogs: LogEntry[] = [
        {
          id: Math.random().toString(),
          timestamp: now(),
          source: 'WEBHOOK',
          message: '🚨 ¡COLISIÓN DETECTADA! 2 ventas entraron exactamente en el mismo instante (ML: #ORD-9812 vs Shopify: #SHP-4019).',
          status: 'warn'
        }
      ];
      setLogs(prev => [...prev, ...newLogs]);

      setTimeout(() => {
        setLogs(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: now(),
            source: 'SAGA',
            message: 'Aplicando Atomic CAS Lock: UPDATE ventas SET status="PROCESSING" WHERE id=ORD-9812 AND status="PENDING".',
            status: 'info'
          }
        ]);
      }, 250);

      setTimeout(() => {
        setLogs(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: now(),
            source: 'SAGA',
            message: 'Lock concedido a Mercado Libre (1ra en milisegundo). Stock decrementado en almacén maestro: 1 -> 0.',
            status: 'success'
          },
          {
            id: Math.random().toString(),
            timestamp: now(),
            source: 'SAGA',
            message: 'Venta concurrente de Shopify (#SHP-4019) evaluada: InsufficientStockError capturado. Rechazada limpiamente sin cobrar ni sobrevender.',
            status: 'warn'
          }
        ]);
        setStock(0);
      }, 650);

      setTimeout(() => {
        setLogs(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: now(),
            source: 'SHOPIFY',
            message: 'Ajuste relativo propagado (delta: 0, stock disponible agotado en < 800ms). IdempotencyKey: saga_lock_9812',
            status: 'success'
          },
          {
            id: Math.random().toString(),
            timestamp: now(),
            source: 'SAGA',
            message: 'Transacción distribuida cerrada como PROCESSED. 0 sobreventas. Reputación blindada.',
            status: 'success'
          }
        ]);
        setIsProcessing(false);
      }, 1100);

    } else {
      const isML = channel === 'MERCADO_LIBRE';
      const orderId = isML ? 'MLM-948102' : 'SHP-810291';
      const sourceTag = isML ? 'ML' : 'SHOPIFY';

      setLogs(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          timestamp: now(),
          source: 'WEBHOOK',
          message: `Webhook recibido desde ${isML ? 'Mercado Libre' : 'Shopify'} (Orden ${orderId}). Firma criptográfica HMAC verificada en 11ms.`,
          status: 'info'
        }
      ]);

      setTimeout(() => {
        const nextStock = Math.max(0, stock - 1);
        setStock(nextStock);
        setLogs(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            timestamp: now(),
            source: 'SAGA',
            message: `Stock maestro actualizado a ${nextStock} unidades. Propagando en paralelo a los canales restantes...`,
            status: 'success'
          },
          {
            id: Math.random().toString(),
            timestamp: now(),
            source: isML ? 'SHOPIFY' : 'ML',
            message: `Ajuste remoto recibido. Actualizado inventario disponible en ${isML ? 'Shopify' : 'Mercado Libre'} a ${nextStock} piezas.`,
            status: 'success'
          }
        ]);
        setIsProcessing(false);
      }, 600);
    }
  };

  const resetStock = () => {
    setStock(1);
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        source: 'SAGA',
        message: 'Inventario de prueba reseteado a 1 unidad. Listo para probar concurrencia.',
        status: 'info'
      }
    ]);
  };

  // Cálculo de penalizaciones por sobreventa
  const estimatedCancellations = Math.max(1, Math.round(monthlyOrders * 0.035)); // 3.5% tasa promedio de sobreventa manual
  const lossInSales = estimatedCancellations * averageTicket;
  const mlPenalties = estimatedCancellations * 280; // Multa administrativa por cancelación imputable al seller
  const totalMonthlyBleed = lossInSales + mlPenalties;

  const payloads = {
    saga: `// Esquema Atómico de Transacción Saga (SQLite / Postgres)
Table ventas {
  id: "uuid-v5" [primary_key]
  external_id: "ORD-9812-MLM" [unique_index]
  sku: "SONY-WH1000XM5-BLK"
  cantidad: 1
  status: "PROCESSING" // PENDING -> PROCESSING -> PROCESSED | FAILED
  sae_decremented: true
  shopify_synced: true
  ml_synced: true
  attempts: 1 // Backoff progresivo: 0s -> 5s -> 20s -> 60s -> 180s
  last_error: null
  idempotency_hash: "sha256(external_id + origin + sku)"
}`,
    shopify: `mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
  inventoryAdjustQuantities(input: {
    reason: "correction",
    name: "available",
    changes: [{
      inventoryItemId: "gid://shopify/InventoryItem/481928301",
      locationId: "gid://shopify/Location/9812401",
      delta: -1
    }]
  }) {
    userErrors { field message }
    inventoryAdjustmentGroup {
      id
      createdAt
      changes { name delta quantityAfterChange }
    }
  }
}
// Header: Idempotency-Key: "shopify_sale_mercadolibre_ORD-9812"`,
    ml: `PUT /items/MLM291823018 HTTP/1.1
Host: api.mercadolibre.com
Authorization: Bearer APP_USR-821039-xxxxxxxx
Content-Type: application/json

{
  "available_quantity": 0,
  "channels": ["marketplace"],
  "price": 6499.00
}

// Sincronización absoluta: evita decrementos duplicados si la red parpadea`
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(payloads[activePayloadTab]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090A0C] text-[#EDEDED] font-sans selection:bg-[#00FF66] selection:text-[#090A0C]">
      
      {/* 1. TOP TELEMETRY STRIP */}
      <div className="border-b border-[#20242C] bg-[#0E1015] px-4 py-2 text-[11px] font-mono text-[#808694]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#00FF66]">
              <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse"></span>
              ORCHESTRATOR ONLINE
            </span>
            <span className="hidden sm:inline text-[#2A2E39]">|</span>
            <span className="hidden sm:inline">ENGINE: <strong className="text-[#EDEDED]">Saga Pattern Distributed Worker</strong></span>
            <span className="hidden md:inline text-[#2A2E39]">|</span>
            <span className="hidden md:inline">FAIL-SAFE: <strong className="text-[#EDEDED]">Atomic CAS Lock (0ms Race Window)</strong></span>
          </div>

          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1">SHOPIFY API: <span className="text-[#00FF66]">142ms</span></span>
            <span className="flex items-center gap-1">ML REST: <span className="text-[#00FF66]">189ms</span></span>
            <span className="flex items-center gap-1">AMAZON SP-API: <span className="text-[#00FF66]">310ms</span></span>
            <span className="flex items-center gap-1">SYNC LATENCY: <span className="text-[#00FF66] font-bold">&lt; 1.8s</span></span>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION BAR */}
      <nav className="border-b border-[#20242C] bg-[#090A0C]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-[#00FF66] flex items-center justify-center text-[#090A0C] font-mono font-black text-sm shadow-hard">
              IS
            </div>
            <div>
              <span className="font-mono font-bold tracking-tight text-base text-white">InventorySync</span>
              <span className="text-[10px] font-mono uppercase ml-2 px-1.5 py-0.5 bg-[#161920] border border-[#262B36] text-[#808694]">
                v2.6.4-prod
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-mono tracking-tight text-[#808694]">
            <a href="#terminal" className="hover:text-white transition-colors">01. SIMULADOR_SAGA</a>
            <a href="#arquitectura" className="hover:text-white transition-colors">02. ARQUITECTURA</a>
            <a href="#calculadora" className="hover:text-white transition-colors">03. IMPACTO_FINANCIERO</a>
            <a href="#payloads" className="hover:text-white transition-colors">04. PAYLOADS_JSON</a>
            <a href="#precios" className="hover:text-white transition-colors">05. PRECIO_UNICO</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-mono text-[#EDEDED] hover:text-white border border-[#20242C] hover:border-[#404656] bg-[#111317] transition-all"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-xs font-mono font-bold text-[#090A0C] bg-[#00FF66] hover:bg-[#00E05A] transition-all shadow-hard-accent flex items-center gap-1.5"
            >
              <span>Ver Demo en Vivo</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* 3. HERO / LIVE SAGA ENGINE TERMINAL (ESTRUCTURA NO GENÉRICA) */}
      <section id="terminal" className="border-b border-[#20242C] bg-grid-tech py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Izquierda: Copy Técnico y Pitch Brutal */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#12141A] border border-[#262B36] text-[11px] font-mono text-[#00FF66]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]"></span>
                CERO ZAPIER • CERO WEBHOOKS ROTAS • CERO MULTAS
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tighter leading-[1.05] text-white">
                Si vendes en Mercado Libre y Shopify a la vez, <span className="text-[#00FF66] underline decoration-2 underline-offset-4">te vas a quedar sin inventario.</span>
              </h1>

              <p className="text-sm text-[#9CA3AF] leading-relaxed font-sans">
                Cuando te queda 1 pieza en bodega y entran 2 ventas al mismo segundo en canales distintos, cualquier script común se rompe. InventorySync orquesta transacciones distribuidas con <strong>patrón Saga y bloqueo atómico Compare-And-Swap</strong>. En menos de 1.8 segundos, todos tus canales conocen el stock real.
              </p>

              {/* Métricas Crudas */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="border border-[#20242C] bg-[#111317] p-3">
                  <div className="text-[10px] font-mono text-[#808694]">VENTANA RACE</div>
                  <div className="text-xl font-mono font-bold text-[#00FF66] mt-1">0 ms</div>
                  <div className="text-[10px] text-[#606775] mt-0.5">CAS lock a nivel DB</div>
                </div>
                <div className="border border-[#20242C] bg-[#111317] p-3">
                  <div className="text-[10px] font-mono text-[#808694]">PROPAGACIÓN</div>
                  <div className="text-xl font-mono font-bold text-white mt-1">&lt; 1.8s</div>
                  <div className="text-[10px] text-[#606775] mt-0.5">Multi-hilo asíncrono</div>
                </div>
                <div className="border border-[#20242C] bg-[#111317] p-3">
                  <div className="text-[10px] font-mono text-[#808694]">SOBREVENTAS</div>
                  <div className="text-xl font-mono font-bold text-[#FF3B00] mt-1">0.00%</div>
                  <div className="text-[10px] text-[#606775] mt-0.5">Garantía estricta</div>
                </div>
              </div>

              {/* Botón de acción directo */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/register"
                  className="px-6 py-3.5 bg-[#00FF66] hover:bg-[#00E05A] text-[#090A0C] font-mono font-bold text-xs uppercase tracking-wider text-center transition-all shadow-hard-accent flex items-center justify-center gap-2"
                >
                  <Cpu size={16} />
                  <span>Conectar mis canales ahora</span>
                </Link>
                <a
                  href="#arquitectura"
                  className="px-5 py-3.5 bg-[#12141A] hover:bg-[#1B1E26] text-[#EDEDED] border border-[#262B36] font-mono text-xs text-center transition-all flex items-center justify-center gap-2"
                >
                  <span>Ver flujo de la Saga</span>
                  <ChevronRight size={14} />
                </a>
              </div>

            </div>

            {/* Derecha: Consola Interactiva de Concurrencia en Vivo */}
            <div className="lg:col-span-7">
              <div className="border border-[#262B36] bg-[#0E1015] shadow-hard overflow-hidden">
                
                {/* Header de la Terminal */}
                <div className="px-4 py-3 bg-[#13161C] border-b border-[#20242C] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#FF5F56] inline-block"></span>
                    <span className="w-2.5 h-2.5 bg-[#FFBD2E] inline-block"></span>
                    <span className="w-2.5 h-2.5 bg-[#27C93F] inline-block"></span>
                    <span className="font-mono text-xs text-[#808694] ml-2">inventory-sync://saga-orchestrator-node-01</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="text-[#808694]">STOCK_ACTUAL:</span>
                      <span className={`px-2 py-0.5 font-black text-xs ${stock > 0 ? 'bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40' : 'bg-[#FF3B00]/20 text-[#FF3B00] border border-[#FF3B00]/40'}`}>
                        {stock} PZAS
                      </span>
                    </div>

                    <button
                      onClick={resetStock}
                      title="Reiniciar a 1 pieza de prueba"
                      className="p-1 hover:bg-[#20242C] text-[#808694] hover:text-white transition-colors"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                {/* Área de Control del Experimento */}
                <div className="p-4 bg-[#111318] border-b border-[#20242C] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <span className="text-[#808694] uppercase tracking-wide">
                    Prueba la orquestación en tiempo real:
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => triggerSaleSimulation('MERCADO_LIBRE')}
                      disabled={isProcessing || stock <= 0}
                      className="px-3 py-1.5 bg-[#FFE600]/10 hover:bg-[#FFE600]/20 text-[#FFE600] border border-[#FFE600]/40 font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      +1 Venta en ML
                    </button>
                    <button
                      onClick={() => triggerSaleSimulation('SHOPIFY')}
                      disabled={isProcessing || stock <= 0}
                      className="px-3 py-1.5 bg-[#96BF48]/10 hover:bg-[#96BF48]/20 text-[#96BF48] border border-[#96BF48]/40 font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      +1 Venta en Shopify
                    </button>
                    <button
                      onClick={() => triggerSaleSimulation('RACE_CONDITION')}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-[#FF3B00] hover:bg-[#E03400] text-black font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-hard"
                    >
                      ⚡ Disparo Concurrente (0ms)
                    </button>
                  </div>
                </div>

                {/* Log Terminal Screen */}
                <div className="p-4 bg-[#090A0C] font-mono text-xs space-y-2 h-[290px] overflow-y-auto">
                  {logs.map((log) => {
                    const statusColor = 
                      log.status === 'success' ? 'text-[#00FF66]' :
                      log.status === 'warn' ? 'text-[#FFB800]' :
                      log.status === 'error' ? 'text-[#FF3B00]' : 'text-[#808694]';
                    
                    const tagBg =
                      log.source === 'SAGA' ? 'bg-[#181B22] text-[#38BDF8] border-[#20242C]' :
                      log.source === 'ML' ? 'bg-[#FFE600]/10 text-[#FFE600] border-[#FFE600]/30' :
                      log.source === 'SHOPIFY' ? 'bg-[#96BF48]/10 text-[#96BF48] border-[#96BF48]/30' :
                      'bg-[#2A1715] text-[#FF5555] border-[#442220]';

                    return (
                      <div key={log.id} className="flex items-start gap-2 leading-relaxed animate-fade-in">
                        <span className="text-[#555C6E] shrink-0 text-[11px]">{log.timestamp}</span>
                        <span className={`px-1.5 py-0.2 text-[10px] font-bold border uppercase shrink-0 ${tagBg}`}>
                          {log.source}
                        </span>
                        <span className={`break-words ${statusColor}`}>{log.message}</span>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>

                {/* Footer de la Terminal */}
                <div className="px-4 py-2.5 bg-[#0E1015] border-t border-[#20242C] flex items-center justify-between text-[11px] font-mono text-[#666D7E]">
                  <span className="flex items-center gap-1.5">
                    <Database size={12} className="text-[#00FF66]" />
                    DB LOCK SERIALIZER: <strong className="text-[#EDEDED]">SQLite WAL / PostgreSQL (Row-level)</strong>
                  </span>
                  <span>IDEMPOTENCY: <strong className="text-[#00FF66]">ENABLED</strong></span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. ANATOMÍA DE LA SAGA (ARQUITECTURA DESPIEZADA) */}
      <section id="arquitectura" className="border-b border-[#20242C] py-16 bg-[#0B0D11]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-mono text-[#00FF66] uppercase tracking-widest font-bold">
              // 02. ANATOMÍA_DEL_SISTEMA
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-2">
              Cómo resolvemos el problema de la sobreventa a nivel de base de datos.
            </h2>
            <p className="text-sm text-[#9CA3AF] mt-2 font-sans">
              Las herramientas de automatización comunes usan webhooks lineales que fallan ante micro-cortes. Nosotros implementamos una máquina de estados con compensación transaccional:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Paso 1 */}
            <div className="border border-[#20242C] bg-[#111317] p-5 flex flex-col justify-between hover:border-[#3A4050] transition-colors shadow-hard">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-[#00FF66] font-bold">FASE 01</span>
                  <Zap size={16} className="text-[#808694]" />
                </div>
                <h3 className="font-mono font-bold text-white text-sm mb-2">Ingesta Asíncrona</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  FastAPI recibe el webhook en menos de 35ms. Valida firma criptográfica HMAC y persiste la orden en la tabla de colas con estado <code className="text-[#00FF66]">PENDING</code>.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#1C2029] font-mono text-[10px] text-[#606775]">
                HTTP 202 Accepted inmediato
              </div>
            </div>

            {/* Paso 2 */}
            <div className="border border-[#20242C] bg-[#111317] p-5 flex flex-col justify-between hover:border-[#3A4050] transition-colors shadow-hard">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-[#00FF66] font-bold">FASE 02</span>
                  <Lock size={16} className="text-[#808694]" />
                </div>
                <h3 className="font-mono font-bold text-white text-sm mb-2">Atomic CAS Lock</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  El worker reclama la venta con un <code className="text-white">Compare-And-Swap</code> atómico a nivel de fila. Si dos procesos tocan la misma orden, uno recibe 0 filas afectadas y aborta.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#1C2029] font-mono text-[10px] text-[#606775]">
                0 colisiones concurrentes
              </div>
            </div>

            {/* Paso 3 */}
            <div className="border border-[#20242C] bg-[#111317] p-5 flex flex-col justify-between hover:border-[#3A4050] transition-colors shadow-hard">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-[#00FF66] font-bold">FASE 03</span>
                  <GitBranch size={16} className="text-[#808694]" />
                </div>
                <h3 className="font-mono font-bold text-white text-sm mb-2">Sync Relativo vs Absoluto</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Shopify recibe ajustes con clave de idempotencia única. Mercado Libre y Amazon reciben el stock absoluto maestro. Si la red cae y se reintenta, el stock no se resta dos veces.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#1C2029] font-mono text-[10px] text-[#606775]">
                Idempotency-Key obligatoria
              </div>
            </div>

            {/* Paso 4 */}
            <div className="border border-[#20242C] bg-[#111317] p-5 flex flex-col justify-between hover:border-[#3A4050] transition-colors shadow-hard">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-[#00FF66] font-bold">FASE 04</span>
                  <Activity size={16} className="text-[#808694]" />
                </div>
                <h3 className="font-mono font-bold text-white text-sm mb-2">Backoff Progresivo Rápido</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Ante errores 503 o timeouts, no esperamos minutos enteros. El 1er reintento se ejecuta a los <strong>5 segundos</strong>, pasando a 20s, 60s y 180s antes de fallar con alerta en panel.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#1C2029] font-mono text-[10px] text-[#606775]">
                5s recovery vs 60s standard
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. CALCULADORA DE SANGRADO FINANCIERO (CONVERSIÓN DIRECTA) */}
      <section id="calculadora" className="border-b border-[#20242C] py-16 bg-[#090A0C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-mono text-[#FF3B00] uppercase tracking-widest font-bold">
                // 03. CALCULADORA_DE_SANGRADO
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                ¿Cuánto dinero estás tirando a la basura por cancelaciones de stock?
              </h2>
              <p className="text-sm text-[#9CA3AF] font-sans leading-relaxed">
                Mercado Libre te baja de categoría de MercadoLíder Platinum si cancelas más del 1.5% de tus ventas por falta de stock. Además de perder la venta y el cliente, te cobran comisiones de castigo.
              </p>

              {/* Sliders interactivos */}
              <div className="space-y-5 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className="text-[#808694]">ÓRDENES MENSUALES MULTICANAL:</span>
                    <span className="font-bold text-[#00FF66]">{monthlyOrders} ventas/mes</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="3000"
                    step="50"
                    value={monthlyOrders}
                    onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                    className="w-full accent-[#00FF66] bg-[#1C2029] h-2 rounded-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className="text-[#808694]">TICKET PROMEDIO POR PRODUCTO:</span>
                    <span className="font-bold text-[#00FF66]">${averageTicket.toLocaleString('es-MX')} MXN</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="5000"
                    step="50"
                    value={averageTicket}
                    onChange={(e) => setAverageTicket(Number(e.target.value))}
                    className="w-full accent-[#00FF66] bg-[#1C2029] h-2 rounded-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Tarjeta de impacto financiero */}
            <div className="lg:col-span-6">
              <div className="border border-[#2D1A18] bg-[#140D0C] p-6 sm:p-8 shadow-hard relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-[#FF3B00] text-black font-mono font-black text-[10px] uppercase">
                  PÉRDIDA ANUALIZADA PROMEDIO
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-mono text-[#FF734B] uppercase tracking-wider">
                    Impacto calculado en tu negocio:
                  </div>

                  <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight">
                    ${(totalMonthlyBleed * 12).toLocaleString('es-MX')} <span className="text-sm font-normal text-[#808694]">MXN / año</span>
                  </div>

                  <div className="border-t border-[#2D1A18] pt-4 space-y-2.5 text-xs font-mono text-[#D1D5DB]">
                    <div className="flex justify-between">
                      <span className="text-[#808694]">Cancelaciones estimadas por mes:</span>
                      <strong className="text-[#FF734B]">{estimatedCancellations} pedidos cancelados</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#808694]">Venta bruta perdida mensual:</span>
                      <strong>${lossInSales.toLocaleString('es-MX')} MXN</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#808694]">Multas y comisiones de castigo ML:</span>
                      <strong>${mlPenalties.toLocaleString('es-MX')} MXN</strong>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#2D1A18]">
                    <div className="p-3 bg-[#1F1210] border border-[#3E1D19] text-xs font-mono text-[#EDEDED] flex items-center justify-between">
                      <span>Costo de InventorySync:</span>
                      <strong className="text-[#00FF66] font-bold text-sm">$197 MXN / mes</strong>
                    </div>
                    <p className="text-[11px] text-[#808694] font-mono mt-2 text-center">
                      El software se paga solo con evitar exactamente 1 cancelación cada dos meses.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. COMPARATIVA TÉCNICA BRUTALISTA (TABLA SIN HUMO) */}
      <section className="border-b border-[#20242C] py-16 bg-[#0B0D11]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-mono text-[#00FF66] uppercase tracking-widest font-bold">
              // 04. BENCHMARK_TÉCNICO
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              ¿Por qué Zapier, Make o un plugin de WordPress no sirven para e-commerce serio?
            </h2>
          </div>

          <div className="overflow-x-auto border border-[#20242C] bg-[#0E1015] shadow-hard">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#20242C] bg-[#12151C] text-[#808694]">
                  <th className="p-4 uppercase">Criterio Técnico</th>
                  <th className="p-4 uppercase text-[#FF5555]">Zapier / Make / Webhooks Simples</th>
                  <th className="p-4 uppercase text-[#00FF66] bg-[#00FF66]/5 border-l border-r border-[#20242C]">
                    InventorySync (Saga Engine)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D212A] text-[#EDEDED]">
                <tr>
                  <td className="p-4 font-bold">Ventas concurrentes simultáneas (&lt; 100ms)</td>
                  <td className="p-4 text-[#FF734B]">❌ Race condition. Se cobran las dos ventas y sobrevendes.</td>
                  <td className="p-4 text-[#00FF66] bg-[#00FF66]/5 border-l border-r border-[#20242C]">
                    ✓ Atomic CAS Lock a nivel DB. Una gana, la otra se rechaza en 0ms.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold">Caída temporal de la API de Mercado Libre</td>
                  <td className="p-4 text-[#FF734B]">❌ Pierde el evento o arroja error genérico 500 sin retry seguro.</td>
                  <td className="p-4 text-[#00FF66] bg-[#00FF66]/5 border-l border-r border-[#20242C]">
                    ✓ Estado retenido en cola. Reintento a los 5s con backoff progresivo.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold">Riesgo de doble resta de inventario</td>
                  <td className="p-4 text-[#FF734B]">❌ Alto. Si un reintento manual pasa, descuenta 2 piezas.</td>
                  <td className="p-4 text-[#00FF66] bg-[#00FF66]/5 border-l border-r border-[#20242C]">
                    ✓ 0%. Uso estricto de Idempotency Keys e inventario absoluto.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold">Integración con ERPs locales (CONTPAQi / SAE)</td>
                  <td className="p-4 text-[#FF734B]">❌ Imposible sin servidores intermediarios costosos.</td>
                  <td className="p-4 text-[#00FF66] bg-[#00FF66]/5 border-l border-r border-[#20242C]">
                    ✓ Compatible nativo vía ODBC SQL Server o importación Excel rápida.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold">Costo al escalar a 5,000 órdenes al mes</td>
                  <td className="p-4 text-[#FF734B]">❌ $80 a $150 USD mensuales por cobro por tarea.</td>
                  <td className="p-4 text-[#00FF66] bg-[#00FF66]/5 border-l border-r border-[#20242C] font-bold">
                    ✓ $197 MXN planos. Sin cobros ocultos por orden sincronizada.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* 7. PAYLOAD INSPECTOR (TRANSPARENCIA DE CÓDIGO REAL) */}
      <section id="payloads" className="border-b border-[#20242C] py-16 bg-[#090A0C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-mono text-[#00FF66] uppercase tracking-widest font-bold">
                // 05. PAYLOAD_INSPECTOR
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Transparencia total de datos: el código que viaja a tus APIs.
              </h2>
            </div>

            {/* Selector de Tabs */}
            <div className="flex items-center gap-1 bg-[#12151C] border border-[#20242C] p-1 font-mono text-xs">
              <button
                onClick={() => setActivePayloadTab('saga')}
                className={`px-3 py-1.5 transition-colors ${activePayloadTab === 'saga' ? 'bg-[#00FF66] text-black font-bold' : 'text-[#808694] hover:text-white'}`}
              >
                SAGA_SCHEMA.sql
              </button>
              <button
                onClick={() => setActivePayloadTab('shopify')}
                className={`px-3 py-1.5 transition-colors ${activePayloadTab === 'shopify' ? 'bg-[#00FF66] text-black font-bold' : 'text-[#808694] hover:text-white'}`}
              >
                SHOPIFY_GRAPHQL.gql
              </button>
              <button
                onClick={() => setActivePayloadTab('ml')}
                className={`px-3 py-1.5 transition-colors ${activePayloadTab === 'ml' ? 'bg-[#00FF66] text-black font-bold' : 'text-[#808694] hover:text-white'}`}
              >
                MERCADOLIBRE_REST.json
              </button>
            </div>
          </div>

          {/* Bloque de código */}
          <div className="border border-[#20242C] bg-[#0E1015] shadow-hard relative">
            <div className="px-4 py-2.5 bg-[#13161C] border-b border-[#20242C] flex items-center justify-between text-xs font-mono">
              <span className="text-[#808694]">Payload verificado y listo para producción</span>
              <button
                onClick={copyPayload}
                className="flex items-center gap-1.5 text-xs text-[#808694] hover:text-[#00FF66] transition-colors"
              >
                {copiedCode ? <CheckCheck size={14} className="text-[#00FF66]" /> : <Copy size={14} />}
                <span>{copiedCode ? 'Copiado al portapapeles' : 'Copiar snippet'}</span>
              </button>
            </div>

            <pre className="p-5 font-mono text-xs text-[#00FF66] overflow-x-auto leading-relaxed bg-[#090A0C]">
              <code>{payloads[activePayloadTab]}</code>
            </pre>
          </div>

        </div>
      </section>

      {/* 8. PRECIO ÚNICO SIN HUMO */}
      <section id="precios" className="border-b border-[#20242C] py-20 bg-grid-tech">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          
          <span className="text-xs font-mono text-[#00FF66] uppercase tracking-widest font-bold">
            // 06. PRICING_SIN_LETRAS_CHIQUITAS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
            Un solo precio. Cero comisiones sobre tus ventas.
          </h2>
          <p className="text-sm text-[#9CA3AF] mt-2 max-w-xl mx-auto font-sans">
            Otras plataformas te castigan cobrándote más conforme más vendes. En InventorySync pagas una suscripción plana y procesas las órdenes que quieras.
          </p>

          <div className="mt-10 border-2 border-[#00FF66] bg-[#0E1015] p-8 sm:p-12 shadow-hard-accent text-left max-w-xl mx-auto relative">
            
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#20242C] pb-6">
              <div>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-black uppercase bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40">
                  ACCESO TOTAL MULTICANAL
                </span>
                <h3 className="text-2xl font-mono font-bold text-white mt-2">Plan Producción Ilimitado</h3>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-4xl sm:text-5xl font-mono font-black text-white">$197</span>
                <span className="text-xs font-mono text-[#808694]"> MXN / mes</span>
              </div>
            </div>

            <div className="py-6 space-y-3 font-mono text-xs text-[#D1D5DB]">
              <div className="flex items-center gap-2.5">
                <Check size={16} className="text-[#00FF66] shrink-0" />
                <span>Sincronización en vivo entre Mercado Libre, Shopify y Amazon.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={16} className="text-[#00FF66] shrink-0" />
                <span>Orquestador Saga distribuido con prevención de sobreventa.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={16} className="text-[#00FF66] shrink-0" />
                <span>Importación y exportación masiva de Excel (.xlsx / .csv).</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={16} className="text-[#00FF66] shrink-0" />
                <span>Catálogo ilimitado de SKUs y órdenes mensuales sin límite.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={16} className="text-[#00FF66] shrink-0" />
                <span>Soporte técnico directo vía tickets y WhatsApp prioritario.</span>
              </div>
            </div>

            <Link
              href="/register"
              className="block w-full py-4 text-center bg-[#00FF66] hover:bg-[#00E05A] text-[#090A0C] font-mono font-black text-sm uppercase tracking-wider transition-all shadow-hard"
            >
              Comenzar prueba ahora mismo
            </Link>

            <div className="mt-4 flex items-center justify-center gap-4 text-[11px] font-mono text-[#606775]">
              <span>✓ Cancela cuando quieras con 1 clic</span>
              <span>•</span>
              <span>✓ Facturación CFDI mexicana</span>
            </div>

          </div>

        </div>
      </section>

      {/* 9. FOOTER MONOLÍTICO INDUSTRIAL */}
      <footer className="bg-[#07080A] py-12 text-xs font-mono text-[#606775]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[#00FF66] flex items-center justify-center text-[#090A0C] font-black text-xs">
              IS
            </div>
            <span>InventorySync Cloud Enterprise © 2026 • Fabricado para e-commerce en México.</span>
          </div>

          <div className="flex items-center gap-6 text-[#808694]">
            <Link href="/inventory" className="hover:text-white transition-colors">Inventario</Link>
            <Link href="/sales" className="hover:text-white transition-colors">Ventas</Link>
            <Link href="/tickets" className="hover:text-white transition-colors">Soporte Técnico</Link>
            <Link href="/login" className="hover:text-white transition-colors">Portal Clientes</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
