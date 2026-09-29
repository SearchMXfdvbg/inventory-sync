'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Terminal,
  Activity,
  Cpu,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw,
  Sliders,
  DollarSign,
  AlertTriangle,
  Play,
  RotateCcw,
  Code2,
  CheckCircle2,
  Server,
  Database,
  Layers
} from 'lucide-react';

interface SimulationLog {
  id: string;
  time: string;
  channel: 'SHOPIFY' | 'MERCADOLIBRE' | 'SAGA_CORE';
  type: 'INFO' | 'LOCK' | 'SYNC' | 'REJECT' | 'ALERT';
  text: string;
}

export default function LandingPage() {
  // Simulador de Concurrencia
  const [stock, setStock] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<SimulationLog[]>([
    {
      id: 'init-1',
      time: '00:00.012',
      channel: 'SAGA_CORE',
      type: 'INFO',
      text: 'Orchestrator online. Redis CAS Mutex activo sobre SKU: SKU-PRO-4090.'
    },
    {
      id: 'init-2',
      time: '00:00.015',
      channel: 'SAGA_CORE',
      type: 'INFO',
      text: 'DB Lock Serializer: SQLite WAL / PostgreSQL (Row-level) en sincronía con Almacén Central.'
    }
  ]);

  // Calculadora de Pérdidas
  const [monthlyOrders, setMonthlyOrders] = useState(1200);
  const [averageTicket, setAverageTicket] = useState(650);

  // Selector de Schemas de Payload
  const [activeSchemaTab, setActiveSchemaTab] = useState<'shopify' | 'mercadolibre' | 'compensate'>('shopify');

  // Rotador dinámico de plataformas cada 2 segundos
  const platforms = [
    { name: 'Mercado Libre', color: 'text-[#ffe600]' },
    { name: 'Amazon', color: 'text-[#ff9900]' },
    { name: 'Shopify', color: 'text-[#95bf47]' },
    { name: 'eBay', color: 'text-[#0064d2]' },
    { name: 'Kaufland', color: 'text-[#e30613]' }
  ];
  const [platformIndex, setPlatformIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setPlatformIndex((prev) => (prev + 1) % platforms.length);
        setIsFading(false);
      }, 250);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSimulating) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simulationLogs, isSimulating]);

  const runRaceConditionSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setStock(1);

    const now = () => {
      const d = new Date();
      return `${d.getSeconds().toString().padStart(2, '0')}:${d.getMilliseconds().toString().padStart(3, '0')}`;
    };

    setSimulationLogs([
      {
        id: `sim-${Date.now()}-0`,
        time: now(),
        channel: 'SAGA_CORE',
        type: 'ALERT',
        text: 'EVENTO: Dos compras entran simultáneamente en Shopify y Mercado Libre con stock físico = 1 (Δt = 12ms).'
      }
    ]);

    setTimeout(() => {
      setSimulationLogs(prev => [
        ...prev,
        {
          id: `sim-${Date.now()}-1`,
          time: now(),
          channel: 'SHOPIFY',
          type: 'INFO',
          text: 'Webhook Shopify: Ingesta Order #9812 por $1,299 MXN (1x SKU-PRO-4090).'
        },
        {
          id: `sim-${Date.now()}-2`,
          time: now(),
          channel: 'MERCADOLIBRE',
          type: 'INFO',
          text: 'Webhook Mercado Libre: Ingesta Pack #20000084 por $1,299 MXN (1x SKU-PRO-4090).'
        }
      ]);
    }, 280);

    setTimeout(() => {
      setSimulationLogs(prev => [
        ...prev,
        {
          id: `sim-${Date.now()}-3`,
          time: now(),
          channel: 'SAGA_CORE',
          type: 'LOCK',
          text: 'ATOMIC CAS LOCK: Shopify obtiene lock de memoria (Redis key lock:sku:SKU-PRO-4090). ML entra a cola de espera.'
        }
      ]);
    }, 550);

    setTimeout(() => {
      setStock(0);
      setSimulationLogs(prev => [
        ...prev,
        {
          id: `sim-${Date.now()}-4`,
          time: now(),
          channel: 'SAGA_CORE',
          type: 'SYNC',
          text: 'Stock decrece: 1 -> 0. Transacción confirmada en SQLite WAL / Postgres. Notificando a Mercado Libre PUT /items/MLM9918.'
        }
      ]);
    }, 850);

    setTimeout(() => {
      setSimulationLogs(prev => [
        ...prev,
        {
          id: `sim-${Date.now()}-5`,
          time: now(),
          channel: 'MERCADOLIBRE',
          type: 'REJECT',
          text: 'COMPROBACIÓN ATÓMICA: La transacción en espera de ML lee stock = 0 antes de comprometer inventario.'
        },
        {
          id: `sim-${Date.now()}-6`,
          time: now(),
          channel: 'SAGA_CORE',
          type: 'ALERT',
          text: 'COMPENSACIÓN SAGA: Se cancela la orden excedente automáticamente. Cero sobreventas, reputación verde intacta.'
        }
      ]);
      setIsSimulating(false);
    }, 1250);
  };

  const resetSimulation = () => {
    setStock(1);
    setIsSimulating(false);
    setSimulationLogs([
      {
        id: 'reset-1',
        time: '00:00.000',
        channel: 'SAGA_CORE',
        type: 'INFO',
        text: 'Estado restablecido: SKU-PRO-4090 con stock = 1.'
      }
    ]);
  };

  // Cálculos de sangrado financiero
  const oversellRate = 0.018;
  const oversoldOrders = Math.round(monthlyOrders * oversellRate);
  const cancelPenaltyPerOrder = averageTicket * 0.15 + 120;
  const monthlyMoneyLoss = Math.round(oversoldOrders * cancelPenaltyPerOrder);
  const reputationRiskHours = Math.round(oversoldOrders * 2.4);

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] bg-grid-tech selection:bg-[#00ff66] selection:text-black">
      {/* Main Navigation */}
      <nav className="border-b border-[#20242c] bg-[#090a0c]/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00ff66] text-black font-bold font-mono-code flex items-center justify-center text-sm shadow-hard">
              //
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg block leading-none">INVENTORY_SYNC</span>
              <span className="font-mono-code text-[10px] text-[#8e95a5] tracking-widest uppercase">Distributed Saga Core</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 font-mono-code text-xs text-[#8e95a5]">
            <a href="#simulador" className="hover:text-white transition-colors">01. PRUEBA_COLISIÓN</a>
            <a href="#arquitectura" className="hover:text-white transition-colors">02. ARQUITECTURA_SAGA</a>
            <a href="#calculadora" className="hover:text-white transition-colors">03. IMPACTO_FINANCIERO</a>
            <a href="#benchmark" className="hover:text-white transition-colors">04. BENCHMARK</a>
            <a href="#pricing" className="hover:text-white transition-colors">05. PRECIO</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[#8e95a5] hover:text-white font-mono-code text-xs px-3 py-2 border border-[#20242c] transition-colors"
            >
              INGRESAR
            </Link>
            <Link
              href="/register"
              className="bg-[#00ff66] hover:bg-[#00e65c] text-black font-mono-code font-bold text-xs px-4 py-2.5 shadow-hard flex items-center gap-2 border border-[#00ff66] transition-transform active:translate-x-0.5 active:translate-y-0.5"
            >
              INICIAR SYNC
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-14 pb-20 border-b border-[#20242c]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#13161c] border border-[#20242c] font-mono-code text-xs text-[#00ff66]">
              <Cpu className="w-3.5 h-3.5" />
              SISTEMA DE SINCRONIZACIÓN DE STOCK EN TIEMPO REAL
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Vender lo que ya no tienes te cuesta la cuenta de{' '}
              <span
                className={`inline-block font-mono-code transition-all duration-300 transform ${
                  isFading ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
                } ${platforms[platformIndex].color} underline decoration-[#20242c] underline-offset-8`}
              >
                {platforms[platformIndex].name}
              </span>
              .
            </h1>

            <p className="text-lg text-[#a1a7b5] leading-relaxed max-w-2xl font-light">
              Los webhooks sin buffer fallan bajo picos de tráfico. Nuestro motor desacoplado utiliza el patrón
              <strong className="text-white font-medium"> Saga con Mutex Distribuido</strong> para bloquear y decrementar existencias en Shopify y Mercado Libre con latencia de 18ms.
            </p>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-3 gap-3 pt-4 font-mono-code">
              <div className="border border-[#20242c] bg-[#0e1015] p-3 shadow-hard">
                <div className="text-[10px] text-[#8e95a5] uppercase">VENTAS DUPLICADAS</div>
                <div className="text-2xl font-bold text-[#00ff66] mt-1">0.00%</div>
                <div className="text-[10px] text-[#555d6e]">Garantía estricta CAS</div>
              </div>
              <div className="border border-[#20242c] bg-[#0e1015] p-3 shadow-hard">
                <div className="text-[10px] text-[#8e95a5] uppercase">LATENCIA TRANSACCIÓN</div>
                <div className="text-2xl font-bold text-white mt-1">&lt; 25ms</div>
                <div className="text-[10px] text-[#555d6e]">In-Memory Redis Lock</div>
              </div>
              <div className="border border-[#20242c] bg-[#0e1015] p-3 shadow-hard">
                <div className="text-[10px] text-[#8e95a5] uppercase">REINTENTOS EXPONENCIALES</div>
                <div className="text-2xl font-bold text-white mt-1">5s Max</div>
                <div className="text-[10px] text-[#555d6e]">Dead-Letter Auto Healing</div>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="bg-white hover:bg-[#ededed] text-black font-mono-code font-bold text-sm px-6 py-3.5 shadow-hard flex items-center gap-2 border border-white"
              >
                CONECTAR SHOPIFY Y MERCADO LIBRE
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#simulador"
                className="bg-[#12141a] hover:bg-[#1a1e27] text-[#ededed] font-mono-code text-xs px-5 py-3.5 border border-[#20242c] flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 text-[#00ff66]" />
                VER PRUEBA DE COLISIÓN
              </a>
            </div>
          </div>

          {/* Interactive Concurrency Terminal Preview */}
          <div id="simulador" className="lg:col-span-5 border border-[#20242c] bg-[#0d0e12] shadow-hard">
            <div className="border-b border-[#20242c] bg-[#14171e] px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono-code text-xs text-[#8e95a5]">
                <Terminal className="w-3.5 h-3.5 text-[#00ff66]" />
                <span>worker.py --benchmark-race-condition</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono-code text-[#00ff66]">STOCK: {stock}</span>
              </div>
            </div>

            <div className="p-4 space-y-3 font-mono-code text-xs min-h-[280px] max-h-[340px] overflow-y-auto">
              {simulationLogs.map((log) => (
                <div key={log.id} className="leading-relaxed border-l-2 pl-2 text-[11px] border-[#20242c]">
                  <span className="text-[#555d6e] mr-2">[{log.time}]</span>
                  <span
                    className={`font-semibold mr-2 ${
                      log.channel === 'SHOPIFY'
                        ? 'text-[#95bf47]'
                        : log.channel === 'MERCADOLIBRE'
                        ? 'text-[#ffe600]'
                        : 'text-[#00ff66]'
                    }`}
                  >
                    {log.channel}
                  </span>
                  <span
                    className={
                      log.type === 'ALERT'
                        ? 'text-[#ff3b00]'
                        : log.type === 'LOCK'
                        ? 'text-[#00ff66]'
                        : log.type === 'REJECT'
                        ? 'text-[#f59e0b]'
                        : 'text-[#a1a7b5]'
                    }
                  >
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            <div className="p-3 border-t border-[#20242c] bg-[#101217] flex items-center justify-between gap-2">
              <button
                onClick={runRaceConditionSimulation}
                disabled={isSimulating}
                className="bg-[#00ff66] disabled:opacity-50 hover:bg-[#00d957] text-black font-mono-code font-bold text-xs px-4 py-2 flex items-center gap-2 transition-all shadow-hard"
              >
                <Play className="w-3.5 h-3.5" />
                {isSimulating ? 'EVALUANDO LOCK...' : 'PROBAR COLISIÓN (VENTA DOBLE)'}
              </button>
              <button
                onClick={resetSimulation}
                disabled={isSimulating}
                className="text-[#8e95a5] hover:text-white font-mono-code text-xs px-3 py-2 border border-[#20242c]"
                title="Restablecer stock"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SAGA Architecture Teardown */}
      <section id="arquitectura" className="px-6 py-20 border-b border-[#20242c] bg-[#0c0d11]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="space-y-3">
            <span className="font-mono-code text-xs text-[#00ff66] tracking-widest uppercase">// Arquitectura de Resiliencia</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Cómo eliminamos la condición de carrera en 4 fases
            </h2>
            <p className="text-[#8e95a5] max-w-2xl text-sm">
              No hacemos peticiones HTTP directas ni usamos automatizadores genéricos. Cada mutación pasa por una máquina de estados distribuida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-[#20242c] bg-[#090a0c] p-6 space-y-4 shadow-hard">
              <div className="w-8 h-8 bg-[#14171e] border border-[#20242c] flex items-center justify-center font-mono-code text-xs text-[#00ff66] font-bold">
                01
              </div>
              <h3 className="text-base font-bold tracking-tight">Ingesta Asíncrona (Buffer)</h3>
              <p className="text-xs text-[#8e95a5] leading-relaxed">
                El webhook entrante responde HTTP 200 en &lt;5ms y deposita el evento en una cola en memoria Redis Streams, absorbiendo picos sin degradar la tienda.
              </p>
            </div>

            <div className="border border-[#20242c] bg-[#090a0c] p-6 space-y-4 shadow-hard">
              <div className="w-8 h-8 bg-[#14171e] border border-[#20242c] flex items-center justify-center font-mono-code text-xs text-[#00ff66] font-bold">
                02
              </div>
              <h3 className="text-base font-bold tracking-tight">Mutex Distribuido CAS</h3>
              <p className="text-xs text-[#8e95a5] leading-relaxed">
                Bloqueo Compare-And-Swap por SKU. Si dos ventas ocurren en el mismo milisegundo, la segunda espera la resolución del lock o ejecuta compensación.
              </p>
            </div>

            <div className="border border-[#20242c] bg-[#090a0c] p-6 space-y-4 shadow-hard">
              <div className="w-8 h-8 bg-[#14171e] border border-[#20242c] flex items-center justify-center font-mono-code text-xs text-[#00ff66] font-bold">
                03
              </div>
              <h3 className="text-base font-bold tracking-tight">Mutación Absoluta y Relativa</h3>
              <p className="text-xs text-[#8e95a5] leading-relaxed">
                No confiamos en la aritmética del canal. Calculamos el delta real y ejecutamos una sincronización de inventario absoluto contra Mercado Libre y Shopify.
              </p>
            </div>

            <div className="border border-[#20242c] bg-[#090a0c] p-6 space-y-4 shadow-hard">
              <div className="w-8 h-8 bg-[#14171e] border border-[#20242c] flex items-center justify-center font-mono-code text-xs text-[#00ff66] font-bold">
                04
              </div>
              <h3 className="text-base font-bold tracking-tight">Backoff Progresivo (5s)</h3>
              <p className="text-xs text-[#8e95a5] leading-relaxed">
                Si la API de Mercado Libre devuelve error 429 (Rate Limit) o 503, el worker reintenta a intervalos calculados sin duplicar la deducción del stock.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Loss Calculator */}
      <section id="calculadora" className="px-6 py-20 border-b border-[#20242c]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <span className="font-mono-code text-xs text-[#ff3b00] tracking-widest uppercase">// Calculadora de Sangrado Financiero</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              ¿Cuánto te cuesta vender sin atomicidad?
            </h2>
            <p className="text-sm text-[#8e95a5] leading-relaxed">
              Mercado Libre penaliza cancelaciones por falta de stock con hasta el 15% del valor de venta, además de degradar tu medalla a naranja o roja, hundiendo tu visibilidad orgánica.
            </p>

            <div className="space-y-5 pt-2">
              <div>
                <div className="flex justify-between text-xs font-mono-code mb-2">
                  <span className="text-[#8e95a5]">ÓRDENES MENSUALES TOTALES:</span>
                  <span className="text-white font-bold">{monthlyOrders.toLocaleString()} pedidos</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="10000"
                  step="100"
                  value={monthlyOrders}
                  onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                  className="w-full accent-[#00ff66] bg-[#20242c] h-1.5 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono-code mb-2">
                  <span className="text-[#8e95a5]">TICKET PROMEDIO POR PRODUCTO:</span>
                  <span className="text-white font-bold">${averageTicket} MXN</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="5000"
                  step="50"
                  value={averageTicket}
                  onChange={(e) => setAverageTicket(Number(e.target.value))}
                  className="w-full accent-[#00ff66] bg-[#20242c] h-1.5 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 border border-[#20242c] bg-[#0e1015] p-8 shadow-hard">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono-code">
              <div className="border-b sm:border-b-0 sm:border-r border-[#20242c] pb-4 sm:pb-0 sm:pr-4">
                <div className="text-[10px] text-[#ff3b00] uppercase font-bold">SOBREVENTAS ESTIMADAS</div>
                <div className="text-3xl font-extrabold text-white mt-2">~{oversoldOrders}</div>
                <div className="text-[10px] text-[#555d6e] mt-1">Concurrencias no resueltas/mes</div>
              </div>

              <div className="border-b sm:border-b-0 sm:border-r border-[#20242c] pb-4 sm:pb-0 sm:pr-4">
                <div className="text-[10px] text-[#ff3b00] uppercase font-bold">PÉRDIDA DIRECTA EN MULTAS</div>
                <div className="text-3xl font-extrabold text-[#ff3b00] mt-2">${monthlyMoneyLoss.toLocaleString()}</div>
                <div className="text-[10px] text-[#555d6e] mt-1">MXN tirados a la basura/mes</div>
              </div>

              <div>
                <div className="text-[10px] text-[#8e95a5] uppercase font-bold">HORAS EN DISPUTAS</div>
                <div className="text-3xl font-extrabold text-white mt-2">{reputationRiskHours} hrs</div>
                <div className="text-[10px] text-[#555d6e] mt-1">Tiempo de soporte desperdiciado</div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-[#14171e] border border-[#20242c] flex items-center justify-between flex-wrap gap-4 font-mono-code text-xs">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#ff3b00]" />
                <span>Costo de suscripción: <strong>$299 MXN/mes</strong> (por apertura) vs Pérdida: <strong className="text-[#ff3b00]">${monthlyMoneyLoss.toLocaleString()} MXN</strong></span>
              </div>
              <Link
                href="/register"
                className="bg-[#00ff66] hover:bg-[#00e65c] text-black font-bold px-4 py-2 shadow-hard"
              >
                PROTEGER MI CUENTA
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Raw Benchmark vs Generic Webhook Tools */}
      <section id="benchmark" className="px-6 py-20 border-b border-[#20242c] bg-[#0c0d11]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="space-y-3">
            <span className="font-mono-code text-xs text-[#00ff66] tracking-widest uppercase">// Benchmark Técnico</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Saga Engine vs Automatizadores Genéricos
            </h2>
            <p className="text-[#8e95a5] text-sm">
              Zapier y Make fueron diseñados para transferir contactos de CRM, no para resolver atomicidad de inventario e-commerce.
            </p>
          </div>

          <div className="overflow-x-auto border border-[#20242c] shadow-hard">
            <table className="w-full text-left font-mono-code text-xs">
              <thead className="bg-[#14171e] border-b border-[#20242c] text-[#8e95a5]">
                <tr>
                  <th className="p-4">CAPACIDAD TÉCNICA</th>
                  <th className="p-4 text-[#00ff66] bg-[#00ff66]/5">INVENTORY_SYNC SAGA</th>
                  <th className="p-4">ZAPIER / MAKE</th>
                  <th className="p-4">PLUGINS DE TERCEROS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20242c] bg-[#090a0c]">
                <tr>
                  <td className="p-4 font-semibold text-white">Manejo de Concurrencia (Race Conditions)</td>
                  <td className="p-4 text-[#00ff66] bg-[#00ff66]/5 font-bold">CAS Mutex en Redis (&lt;20ms)</td>
                  <td className="p-4 text-[#ff3b00]">Nulo (Sobrevende ambas tiendas)</td>
                  <td className="p-4 text-[#8e95a5]">Cron job (Retraso de 15 a 60 min)</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Rate Limit Handling (429 Too Many Requests)</td>
                  <td className="p-4 text-[#00ff66] bg-[#00ff66]/5 font-bold">Reintento progresivo 5s con Jitter</td>
                  <td className="p-4 text-[#ff3b00]">Falla el Zap y cobra la tarea</td>
                  <td className="p-4 text-[#8e95a5]">Cuelga el servidor de la tienda</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Sincronización Bidireccional</td>
                  <td className="p-4 text-[#00ff66] bg-[#00ff66]/5 font-bold">Simétrica (Shopify &harr; ML)</td>
                  <td className="p-4 text-[#8e95a5]">Loop infinito si no se filtra manual</td>
                  <td className="p-4 text-[#8e95a5]">Unidireccional en planes base</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Costo por 10,000 Transacciones</td>
                  <td className="p-4 text-[#00ff66] bg-[#00ff66]/5 font-bold">
                    $299 MXN / mes
                    <span className="block text-[11px] font-normal text-[#8e95a5] mt-0.5">
                      <span className="line-through text-[#ff3b00]/80">$499 MXN</span> (precio real) • Válido 6 meses
                    </span>
                  </td>
                  <td className="p-4 text-[#ff3b00]">$70+ USD (~$1,250 MXN)</td>
                  <td className="p-4 text-[#8e95a5]">$50+ USD/mes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Payload Inspector */}
      <section className="px-6 py-20 border-b border-[#20242c]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="font-mono-code text-xs text-[#00ff66] tracking-widest uppercase">// Esquemas de Transacción</span>
              <h2 className="text-3xl font-bold tracking-tight">Inspección de Carga Útil en Memoria</h2>
            </div>
            <div className="flex border border-[#20242c] font-mono-code text-xs bg-[#0e1015]">
              <button
                onClick={() => setActiveSchemaTab('shopify')}
                className={`px-4 py-2 ${activeSchemaTab === 'shopify' ? 'bg-[#20242c] text-[#00ff66]' : 'text-[#8e95a5]'}`}
              >
                SHOPIFY_WEBHOOK
              </button>
              <button
                onClick={() => setActiveSchemaTab('mercadolibre')}
                className={`px-4 py-2 border-l border-[#20242c] ${activeSchemaTab === 'mercadolibre' ? 'bg-[#20242c] text-[#00ff66]' : 'text-[#8e95a5]'}`}
              >
                ML_MUTATION
              </button>
              <button
                onClick={() => setActiveSchemaTab('compensate')}
                className={`px-4 py-2 border-l border-[#20242c] ${activeSchemaTab === 'compensate' ? 'bg-[#20242c] text-[#00ff66]' : 'text-[#8e95a5]'}`}
              >
                COMPENSATION_EVENT
              </button>
            </div>
          </div>

          <div className="border border-[#20242c] bg-[#090a0c] p-6 font-mono-code text-xs overflow-x-auto shadow-hard">
            {activeSchemaTab === 'shopify' && (
              <pre className="text-[#a1a7b5] leading-relaxed">
{`{
  "topic": "orders/paid",
  "shop_domain": "mexico-tech-outlet.myshopify.com",
  "line_items": [
    {
      "sku": "SKU-PRO-4090",
      "quantity": 1,
      "price": "1299.00",
      "variant_id": 48921092819
    }
  ],
  "saga_meta": {
    "trace_id": "tr-7f09a88c",
    "received_at": 1727479800122,
    "cas_key": "lock:inventory:SKU-PRO-4090"
  }
}`}
              </pre>
            )}

            {activeSchemaTab === 'mercadolibre' && (
              <pre className="text-[#a1a7b5] leading-relaxed">
{`PUT /items/MLM991823901/variations/1782910819 HTTP/1.1
Host: api.mercadolibre.com
Authorization: Bearer APP_USR-9812903-0921-998
Content-Type: application/json

{
  "available_quantity": 0,
  "attributes": [
    { "id": "SELLER_SKU", "value_name": "SKU-PRO-4090" }
  ],
  "delta_reference": {
    "initiator": "shopify_sync_worker",
    "execution_time_ms": 19.4
  }
}`}
              </pre>
            )}

            {activeSchemaTab === 'compensate' && (
              <pre className="text-[#a1a7b5] leading-relaxed">
{`{
  "action": "SAGA_COMPENSATE",
  "status": "ROLLBACK_OR_NOTIFY",
  "reason": "STOCK_EXHAUSTED_CONCURRENT_RACE",
  "payload": {
    "sku": "SKU-PRO-4090",
    "rejected_channel": "MERCADOLIBRE",
    "order_id": "20000084",
    "customer_resolution": "AUTO_REFUND_NO_REPUTATION_STRIKE"
  }
}`}
              </pre>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-20 border-b border-[#20242c] bg-[#0c0d11]">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="font-mono-code text-xs text-[#00ff66] tracking-widest uppercase">// Tarifa de Producción</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Un solo plan. Sin comisiones sorpresa.</h2>
            <p className="text-sm text-[#8e95a5]">Sin límites artificiales de SKUs, sin cobrar porcentaje de tus ventas.</p>
          </div>

          <div className="border-2 border-[#00ff66] bg-[#090a0c] p-8 sm:p-10 shadow-hard-accent relative">
            <div className="absolute -top-3.5 right-6 bg-[#00ff66] text-black font-mono-code font-bold text-[10px] px-3 py-1 uppercase tracking-widest">
              OFERTA DE APERTURA — VÁLIDO 6 MESES
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-[#20242c]">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-block bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/30 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-widest font-mono-code">
                    PRECIO POR APERTURA
                  </span>
                  <span className="text-[11px] text-[#00ff66] font-mono-code font-semibold">
                    • Válido por los primeros 6 meses
                  </span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight">Saga Core Engine</h3>
                <p className="text-xs text-[#8e95a5] mt-1 font-mono-code">Sincronización continua Shopify &harr; Mercado Libre</p>
              </div>
              <div className="font-mono-code text-left md:text-right">
                <div className="flex items-baseline gap-2 justify-start md:justify-end">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#00ff66] tracking-tight">$299</span>
                  <span className="text-xs text-[#8e95a5] font-normal">MXN / mes</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 justify-start md:justify-end text-xs font-mono-code">
                  <span className="text-[#8e95a5]">Precio real:</span>
                  <span className="line-through text-[#ff3b00] font-bold text-sm tracking-wide decoration-[#ff3b00] decoration-2">
                    $499 MXN / mes
                  </span>
                </div>
                <div className="text-[11px] text-[#8e95a5] mt-1 font-mono-code">
                  * Válido por los primeros 6 meses
                </div>
                <div className="text-[11px] text-[#00ff66] mt-0.5">Facturable con CFDI 4.0 al instante</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8 font-mono-code text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
                <span>SKUs ilimitados en ambas plataformas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
                <span>Mutex CAS anti-sobreventa (&lt;20ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
                <span>Reintentos automáticos progresivos (5s)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
                <span>Detección automática de Catálogo & CSV/Excel</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
                <span>Panel de conciliación de discrepancias</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
                <span>Soporte directo vía tickets de ingeniería</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto flex-1 bg-[#00ff66] hover:bg-[#00d957] text-black font-mono-code font-bold text-sm py-4 px-8 text-center shadow-hard flex items-center justify-center gap-2"
              >
                COMENZAR PRUEBA DE 14 DÍAS SIN RIESGO
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto text-center font-mono-code text-xs text-[#8e95a5] hover:text-white px-6 py-4 border border-[#20242c]"
              >
                YA TENGO CUENTA
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-[#08090b] border-t border-[#20242c] font-mono-code text-xs text-[#555d6e]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-[#ededed]">
            <span className="font-bold">// INVENTORY_SYNC</span>
            <span className="text-[#3a3f4d]">|</span>
            <span className="text-[#8e95a5]">Arquitectura de sincronización distribuida para comercio electrónico</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors">Ingresar</Link>
            <Link href="/register" className="hover:text-white transition-colors">Registro</Link>
            <Link href="/tickets" className="hover:text-white transition-colors">Soporte Técnico</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
