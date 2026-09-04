'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ShieldCheck, 
  Scale, 
  Box, 
  Layers, 
  Zap, 
  MessageCircle, 
  ChevronDown, 
  ChevronUp,
  Store,
  RefreshCw,
  Clock,
  Truck,
  AlertTriangle,
  Building2,
  Lock
} from 'lucide-react';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const whatsappLink = (planName: string) => {
    const text = encodeURIComponent(
      `¡Hola! Me interesa activar el plan ${planName} de InventorySync para eliminar sobreventas entre Mercado Libre, TikTok Shop, Shopify y Amazon.`
    );
    return `https://wa.me/5215555555555?text=${text}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Banner */}
      <div className="bg-slate-900 text-slate-200 text-xs font-semibold py-2.5 px-4 text-center border-b border-slate-800">
        <span>🚀 PROMOCIÓN DE LANZAMIENTO: Sincroniza Mercado Libre, TikTok, Shopify y Amazon por solo <strong className="text-white">$197 MXN</strong> tu primer mes.</span>
      </div>

      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-blue-500/20">
              IS
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">InventorySync</span>
              <span className="text-[10px] text-blue-600 font-bold uppercase ml-2 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 tracking-wider">
                Multi-Channel
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#problema" className="hover:text-slate-900 transition-colors">El Peligro de Sobreventa</a>
            <a href="#como-funciona" className="hover:text-slate-900 transition-colors">¿Cómo Funciona?</a>
            <a href="#precios" className="hover:text-slate-900 transition-colors">Planes y Precios</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">Preguntas Frecuentes</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/login?mode=register"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              Crear Cuenta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
            ¿Tienes sobreventas en{' '}
            <span className="text-blue-600">
              Mercado Libre, TikTok, Shopify y Amazon?
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Vender en varios canales sin inventario sincronizado es una bomba de tiempo: te compran la misma pieza en dos tiendas, tienes que cancelar y <strong>Mercado Libre o Amazon te destruyen la reputación</strong>.
          </p>

          <p className="mt-3 text-base sm:text-lg text-slate-700 font-medium max-w-2xl mx-auto">
            <strong>InventorySync descuenta tu stock en tiempo real en todos tus canales en automático</strong> en segundos tras cada venta. Y como extra, incluye Auto-Fix de medidas y pesos para que TikTok Shop nunca te rebote un producto.
          </p>

          {/* Badges de Canales Sincronizados */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="px-3.5 py-1.5 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              🟡 Mercado Libre
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
              ⚫ TikTok Shop
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              🟢 Shopify
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              🟠 Amazon
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              🏢 CONTPAQi SAE / Almacén Físico
            </span>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#precios"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-3 active:scale-98"
            >
              <span>Eliminar Sobreventas por $197 MXN</span>
              <ArrowRight size={18} />
            </a>

            <Link
              href="/catalog"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Store size={18} className="text-blue-600" />
              <span>Ver Demostración en Vivo</span>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-600" /> Sincronización en &lt; 3 segundos
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-600" /> Reputación 100% blindada
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-600" /> Incluye Auto-Fix TikTok
            </span>
          </div>
        </div>
      </section>

      {/* Comparison: The Pain vs The Solution */}
      <section id="problema" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">El Peligro Real de Vender sin Sincronización</h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">
              Las sobreventas no solo te hacen perder dinero: te pueden costar la suspensión de tu cuenta en Mercado Libre o Amazon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Way */}
            <div className="bg-red-50/50 border border-red-200 rounded-3xl p-8 relative shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <XCircle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-950">Sin Sincronizador (A mano / Desconectado)</h3>
                  <p className="text-xs text-red-700/80">Cancelaciones forzadas y estrés diario</p>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="text-red-600 mt-0.5 font-bold">✕</span>
                  <span><strong>Sobreventas cruzadas:</strong> Vendes tu última pieza en Shopify y 5 minutos después entra la misma venta en Mercado Libre o Amazon.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 mt-0.5 font-bold">✕</span>
                  <span><strong>Caída de Reputación:</strong> Mercado Libre te baja a amarillo o rojo por cancelar ventas por falta de stock. En Amazon pierdes la Buy Box al instante.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 mt-0.5 font-bold">✕</span>
                  <span><strong>Rebotes de catálogo en TikTok:</strong> Intentas subir productos a TikTok Shop y te los rechaza por medidas mayores a 100cm o falta de peso/garantía.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 mt-0.5 font-bold">✕</span>
                  <span><strong>Excel a medianoche:</strong> Terminas tu jornada contando piezas a mano y modificando inventarios tienda por tienda.</span>
                </li>
              </ul>
            </div>

            {/* The New Way */}
            <div className="bg-blue-50/40 border-2 border-blue-500/30 rounded-3xl p-8 relative shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Con InventorySync (Sincronización Total)</h3>
                  <p className="text-xs text-blue-600 font-semibold">Stock idéntico en todos lados en tiempo real</p>
                </div>
              </div>

              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 mt-0.5 font-bold">✓</span>
                  <span><strong>Descuento Inmediato en Cascada:</strong> Cae una venta en cualquier canal ➔ el stock se descuenta en segundos en todos los demás automáticamente.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 mt-0.5 font-bold">✓</span>
                  <span><strong>Reputación 100% Protegida:</strong> Cero cancelaciones por falta de producto. Mantén tu medalla de MercadoLíder Platinum y tus cuentas seguras.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 mt-0.5 font-bold">✓</span>
                  <span><strong>Auto-Fix TikTok Shop Incluido:</strong> Convierte medidas rebeldes a límites válidos (99×99×99 cm) y normaliza pesos para aprobación instantánea.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 mt-0.5 font-bold">✓</span>
                  <span><strong>Conexión con tu Almacén / ERP:</strong> Compatible con CONTPAQi SAE para que tu inventario físico cuadre a la perfección con la nube.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works: 3 Steps */}
      <section id="como-funciona" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Flujo Ultra Sencillo</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">Listo en 3 Pasos sin Complicaciones</h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">
              No necesitas saber de programación ni contratar una agencia cara.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center mb-4 text-base shadow-md shadow-blue-500/20">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Conectas tus Tiendas</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ingresas tus accesos de Shopify, Mercado Libre o TikTok Shop en 1 minuto. El sistema valida la conexión de inmediato.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center mb-4 text-base shadow-md shadow-blue-500/20">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Unificas tu Inventario</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Nuestro motor concilia las cantidades disponibles en cada canal y detecta cualquier desface o error de especificaciones.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center mb-4 text-base shadow-md shadow-blue-500/20">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Duermes Tranquilo</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Cada que cae una venta, el inventario se descuenta en automático en segundos. Cero sobreventas y cero cancelaciones de por vida.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (The 3 Agreed Plans) */}
      <section id="precios" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Inversión Inteligente</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">Planes Claros, Sin Letras Chiquitas</h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">
              No pagues miles de pesos por integradores que no resuelven. Elige el plan que se adapte a tu tamaño de negocio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Plan 1: Fix Básico */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:border-slate-300 transition-all">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Plan 1</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">Fix Básico</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Ideal para tiendas que solo quieren dejar de rebotar en TikTok y sincronizar catálogo base.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900">$197</span>
                  <span className="text-xs font-semibold text-slate-500">MXN / 1er mes</span>
                </div>
                <p className="text-xs font-semibold text-blue-600 mt-1">Luego solo $497 MXN / mes</p>

                <div className="w-full h-px bg-slate-100 my-6" />

                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Sincronización <strong>Shopify ➔ TikTok Shop</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span><strong>Auto-Fix de Medidas:</strong> ajusta a 100x100x100</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span><strong>Auto-Fix de Peso:</strong> normaliza decimales</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Inyección de garantía estándar de 30 días</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Hasta <strong>200 productos</strong></span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all text-center block"
                >
                  Comenzar por $197 MXN
                </Link>
              </div>
            </div>

            {/* Plan 2: Vendedor Pro (Featured) */}
            <div className="bg-blue-50/30 border-2 border-blue-600 rounded-3xl p-8 flex flex-col justify-between relative shadow-xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-extrabold uppercase px-4 py-1 rounded-full shadow-md">
                ⭐ El Más Vendido
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Plan 2</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">Vendedor Pro</h3>
                <p className="text-xs text-slate-600 mt-2">
                  Para vendedores activos en Mercado Libre, TikTok, Shopify y Amazon.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900">$997</span>
                  <span className="text-xs font-semibold text-slate-500">MXN / mes</span>
                </div>
                <p className="text-xs font-semibold text-emerald-600 mt-1">Sin límite de productos</p>

                <div className="w-full h-px bg-slate-200 my-6" />

                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2.5 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span><strong>Sincronización en tiempo real</strong> (Mercado Libre, Shopify, TikTok)</span>
                  </li>
                  <li className="flex items-center gap-2.5 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span><strong>Productos ilimitados</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Modo <strong>"Envío del Vendedor"</strong> automático (&gt;60cm)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Sincronización de stock cada <strong>30 minutos</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Exportación de plantilla TikTok CSV en 1 clic</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Soporte directo por WhatsApp</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href="/login"
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all text-center block shadow-md shadow-blue-500/25 active:scale-98"
                >
                  Elegir Plan Pro ($997 MXN)
                </Link>
              </div>
            </div>

            {/* Plan 3: Agencia & ERP Personalizado */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:border-slate-300 transition-all">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Plan 3</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">Agencia & ERP</h3>
                <p className="text-xs text-slate-500 mt-2">
                  Para empresas con múltiples marcas o que requieren conexión con su sistema contable.
                </p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900">$1,997</span>
                  <span className="text-xs font-semibold text-slate-500">MXN / mes</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Multi-tienda + Conexión ERP</p>

                <div className="w-full h-px bg-slate-100 my-6" />

                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Todo lo del plan Pro</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Hasta <strong>5 tiendas TikTok / Shopify / ML</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5 font-medium text-slate-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Conexión con <strong>CONTPAQi SAE</strong> o ERP local</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Etiquetas automáticas con medida real</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Setup inicial 1 a 1 asistido con ingeniero</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <a
                  href={whatsappLink('Agencia / ERP')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all text-center flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  <MessageCircle size={16} />
                  <span>Cotizar por WhatsApp</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Resolvemos tus Dudas</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">Preguntas Frecuentes</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: '¿Cómo evita InventorySync las sobreventas?',
              a: 'InventorySync funciona como un orquestador central en tiempo real. Cuando una venta entra por Shopify, Mercado Libre o TikTok Shop, nuestro worker atómico descuenta inmediatamente el inventario en todas las demás tiendas en menos de 3 segundos, evitando que dos clientes compren la misma unidad.'
            },
            {
              q: '¿Por qué TikTok Shop rechaza mis productos con medidas reales?',
              a: 'Cuando usas el envío integrado de TikTok (Platform Shipping), su sistema impone límites estrictos de paquetería de máximo 100 × 100 × 100 cm y 30 kg. Si tu producto mide más, el robot de TikTok lo rechaza en automático. Nuestro sistema lo ajusta al tope de plataforma o activa la modalidad de Envío del Vendedor para que pase sin problemas.'
            },
            {
              q: '¿Modifica mis productos en mi tienda web de Shopify?',
              a: 'No altera tus títulos ni tus fotos. Solo inyecta de forma segura los atributos de empaque, peso limpio y etiquetas estructuradas que TikTok necesita para autorizar la venta.'
            },
            {
              q: '¿Cómo funciona la prueba de $197 MXN?',
              a: 'Pagas únicamente $197 pesos por tu primer mes completo. Conectas tu tienda, desbloqueas tu catálogo y compruebas que tus productos queden sincronizados. A partir del segundo mes continuas con la tarifa regular de $497/mes. Puedes cancelar en cualquier momento con un clic.'
            },
            {
              q: '¿Qué pasa si tengo mi inventario en un sistema contable como CONTPAQi SAE?',
              a: 'Tenemos el conector directo para sincronizar CONTPAQi SAE en tu computadora con Shopify, TikTok Shop y Mercado Libre simultáneamente. Selecciona el Plan Agencia o contáctanos por WhatsApp para una cotización personalizada.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer transition-colors hover:border-slate-300 shadow-sm"
              onClick={() => toggleFaq(idx)}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold text-slate-900 text-base">{item.q}</h3>
                {openFaq === idx ? (
                  <ChevronUp size={18} className="text-blue-600 shrink-0" />
                ) : (
                  <ChevronDown size={18} className="text-slate-400 shrink-0" />
                )}
              </div>
              {openFaq === idx && (
                <p className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 bg-slate-900 text-slate-400 text-xs text-center">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              IS
            </div>
            <span className="font-bold text-white text-sm">InventorySync</span>
          </div>
          <p>© 2026 InventorySync México. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/catalog" className="hover:text-white">Demostración</Link>
            <Link href="/login" className="hover:text-white">Acceso Clientes</Link>
            <a href={whatsappLink('Soporte')} target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-1">
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
