"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Upload,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Package,
  Zap,
  FileSpreadsheet,
  Minus,
  Plus,
  Store,
} from "lucide-react";
import { getHeaders, API_BASE_URL } from "@/lib/api";

// ---------- Types ----------
interface DemoProduct {
  sku: string;
  nombre: string;
  inventory_item_id: string;
  stock_actual: number;
}

interface SyncResult {
  sku: string;
  units_sold: number;
  stock_resultante: number | string;
  status: string;
}

// ---------- Component ----------
export default function DemoPage() {
  const [products, setProducts] = useState<DemoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Manual sale state: { [sku]: qty }
  const [manualQty, setManualQty] = useState<Record<string, number>>({});

  const fileRef = useRef<HTMLInputElement>(null);

  // ---- Fetch live stock from Shopify ----
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/demo/products`, { headers: getHeaders() });
      const data = await r.json();
      if (data.products) setProducts(data.products);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ---- Download Excel template ----
  const downloadTemplate = async () => {
    const r = await fetch(`${API_BASE_URL}/demo/template`, { headers: getHeaders() });
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demo_ventas.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Upload Excel & sync ----
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncing(true);
    setResults([]);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${API_BASE_URL}/demo/sync-excel`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": undefined as unknown as string },
        body: form,
      });
      const data = await r.json();
      setResults(data.results || []);
      setMessage({ text: data.message, ok: data.success });
      if (data.success) await fetchProducts();
    } catch (err) {
      setMessage({ text: `Error: ${err}`, ok: false });
    } finally {
      setSyncing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ---- Manual sale ----
  const handleManualSale = async (sku: string) => {
    const qty = manualQty[sku] || 0;
    if (qty <= 0) return;
    setSyncing(true);
    setMessage(null);
    try {
      const r = await fetch(`${API_BASE_URL}/demo/manual-sale`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ sku, units_sold: qty }),
      });
      const data = await r.json();
      setMessage({ text: data.message, ok: data.success });
      if (data.success) {
        setResults([
          {
            sku: data.sku,
            units_sold: data.units_sold,
            stock_resultante: data.stock_resultante,
            status: "✅ Descontado en Shopify",
          },
        ]);
        setManualQty((prev) => ({ ...prev, [sku]: 0 }));
        await fetchProducts();
      }
    } catch (err) {
      setMessage({ text: `Error: ${err}`, ok: false });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
      {/* ---- Header ---- */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/20 rounded-xl">
            <Zap className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Modo Demo — Sincronización en Vivo</h1>
            <p className="text-slate-400 text-sm">
              Simula ventas físicas y descuenta inventario en{" "}
              <span className="text-green-400 font-medium">Shopify</span> en tiempo real
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-3 py-1">
            <Store className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-xs font-medium">lyvy-demo-777.myshopify.com</span>
          </div>
        </div>

        {/* ---- How it works banner ---- */}
        <div className="mt-4 mb-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex flex-wrap gap-6 text-sm text-slate-300">
          {[
            { icon: "1️⃣", label: "Descarga la plantilla Excel" },
            { icon: "2️⃣", label: "Llena las unidades vendidas" },
            { icon: "3️⃣", label: "Sube el archivo aquí" },
            { icon: "4️⃣", label: "¡Shopify se actualiza en vivo!" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-lg">{s.icon}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ---- Stock actual ---- */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              Inventario actual en Shopify
            </h2>
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.map((p) => (
                <div
                  key={p.sku}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div>
                    <div className="text-xs text-indigo-400 font-mono mb-0.5">{p.sku}</div>
                    <div className="font-semibold text-sm">{p.nombre}</div>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {p.stock_actual}
                    <span className="text-slate-400 text-sm font-normal ml-1">unidades</span>
                  </div>

                  {/* Manual sale controls */}
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() =>
                        setManualQty((prev) => ({ ...prev, [p.sku]: Math.max(0, (prev[p.sku] || 0) - 1) }))
                      }
                      className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={manualQty[p.sku] || 0}
                      onChange={(e) =>
                        setManualQty((prev) => ({ ...prev, [p.sku]: Math.max(0, parseInt(e.target.value) || 0) }))
                      }
                      className="w-12 text-center bg-white/10 border border-white/20 rounded-lg py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() =>
                        setManualQty((prev) => ({ ...prev, [p.sku]: (prev[p.sku] || 0) + 1 }))
                      }
                      className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleManualSale(p.sku)}
                      disabled={syncing || !manualQty[p.sku]}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-1.5 text-xs font-medium transition-colors"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Vender
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- Excel actions ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Download template */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Plantilla Excel</div>
                <div className="text-xs text-slate-400">Descarga y llena las ventas del día</div>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar demo_ventas.xlsx
            </button>
          </div>

          {/* Upload & sync */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Upload className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Sincronizar con Excel</div>
                <div className="text-xs text-slate-400">Sube el archivo con ventas del día</div>
              </div>
            </div>
            <label className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer">
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sincronizando con Shopify...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Subir Excel y sincronizar
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={syncing}
              />
            </label>
          </div>
        </div>

        {/* ---- Result message ---- */}
        {message && (
          <div
            className={`flex items-start gap-3 rounded-xl p-4 mb-6 border ${
              message.ok
                ? "bg-green-500/10 border-green-500/30 text-green-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {message.ok ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* ---- Sync results table ---- */}
        {results.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-white/10">
              <h3 className="font-semibold text-sm">Resultados de la sincronización</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="text-left px-5 py-2.5">SKU</th>
                  <th className="text-center px-5 py-2.5">Vendidas</th>
                  <th className="text-center px-5 py-2.5">Stock final</th>
                  <th className="text-left px-5 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 font-mono text-indigo-300">{r.sku}</td>
                    <td className="px-5 py-3 text-center text-red-400 font-bold">-{r.units_sold}</td>
                    <td className="px-5 py-3 text-center font-bold text-white">{r.stock_resultante}</td>
                    <td className="px-5 py-3 text-xs">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Footer note ---- */}
        <div className="text-center text-xs text-slate-500">
          Los cambios se reflejan inmediatamente en{" "}
          <a
            href="https://lyvy-demo-777.myshopify.com/admin/products"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            Shopify Admin ↗
          </a>
        </div>
      </div>
    </div>
  );
}
