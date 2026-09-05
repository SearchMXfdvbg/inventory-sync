import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ChevronDown, 
  ArrowUpDown, 
  Tag, 
  Building2, 
  Layers, 
  Boxes, 
  AlertTriangle, 
  PackageX, 
  CheckCircle2, 
  Sparkles,
  RotateCcw
} from 'lucide-react';

export interface FilterBarCounts {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  overStock: number;
  desync: number;
  local: number;
}

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  quickFilter: string;
  setQuickFilter: (val: string) => void;
  counts: FilterBarCounts;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  brands: string[];
  selectedBrand: string;
  setSelectedBrand: (val: string) => void;
  minStock: string;
  setMinStock: (val: string) => void;
  maxStock: string;
  setMaxStock: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  quickFilter,
  setQuickFilter,
  counts,
  categories,
  selectedCategory,
  setSelectedCategory,
  brands,
  selectedBrand,
  setSelectedBrand,
  minStock,
  setMinStock,
  maxStock,
  setMaxStock,
  sortBy,
  setSortBy,
  itemsPerPage,
  setItemsPerPage,
  onClearFilters,
  activeFiltersCount
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
      {/* 1. Barra Principal: Búsqueda Universal + Botón Filtros Avanzados + Ordenamiento */}
      <div className="p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
        {/* Input de Búsqueda */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por SKU, Nombre, Categoría, Marca, Código de Barras..."
            className="pl-10 pr-9 py-2.5 w-full border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-slate-50/70 dark:bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Controles de Acción Rápida: Ordenar, Ítems por pág, Toggle Avanzado */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Ordenamiento */}
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-slate-400 pointer-events-none">
              <ArrowUpDown size={14} />
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-8 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none shadow-sm"
            >
              <option value="name_asc">Nombre: A → Z</option>
              <option value="name_desc">Nombre: Z → A</option>
              <option value="sku_asc">SKU: A → Z</option>
              <option value="sku_desc">SKU: Z → A</option>
              <option value="stock_desc">Mayor Stock (↓)</option>
              <option value="stock_asc">Menor Stock (↑)</option>
              <option value="price_desc">Mayor Precio (↓)</option>
              <option value="price_asc">Menor Precio (↑)</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Selector de Ítems por Página */}
          <div className="relative flex items-center">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none shadow-sm pr-7"
            >
              <option value={10}>10 por pág.</option>
              <option value={25}>25 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
              <option value={200}>200 (Todos)</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
          </div>

          {/* Toggle de Filtros Avanzados */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              showAdvanced || activeFiltersCount > 0
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Filtros Pro</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-extrabold ml-0.5">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Botón Limpiar Todo (si hay filtros activos) */}
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
              title="Restablecer todos los filtros"
            >
              <RotateCcw size={13} />
              <span>Limpiar ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Pestañas de Filtros Rápidos (Quick Pills con conteos en vivo) */}
      <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setQuickFilter('all')}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            quickFilter === 'all'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers size={13} />
          <span>Todos</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${quickFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {counts.total}
          </span>
        </button>

        <button
          onClick={() => setQuickFilter('instock')}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            quickFilter === 'instock'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 size={13} />
          <span>En Stock (&gt;0)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${quickFilter === 'instock' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {counts.inStock}
          </span>
        </button>

        <button
          onClick={() => setQuickFilter('lowstock')}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            quickFilter === 'lowstock'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle size={13} />
          <span>Stock Bajo (&lt;10)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${quickFilter === 'lowstock' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {counts.lowStock}
          </span>
        </button>

        <button
          onClick={() => setQuickFilter('outofstock')}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            quickFilter === 'outofstock'
              ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PackageX size={13} />
          <span>Agotados (0)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${quickFilter === 'outofstock' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {counts.outOfStock}
          </span>
        </button>

        <button
          onClick={() => setQuickFilter('overstock')}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            quickFilter === 'overstock'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Boxes size={13} />
          <span>Sobre-Stock (&gt;100)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${quickFilter === 'overstock' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {counts.overStock}
          </span>
        </button>

        {counts.desync > 0 && (
          <button
            onClick={() => setQuickFilter('desync')}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              quickFilter === 'desync'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <AlertTriangle size={13} />
            <span>Desincronizados</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${quickFilter === 'desync' ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'}`}>
              {counts.desync}
            </span>
          </button>
        )}

        <button
          onClick={() => setQuickFilter('local')}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            quickFilter === 'local'
              ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles size={13} />
          <span>Solo Local</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${quickFilter === 'local' ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {counts.local}
          </span>
        </button>
      </div>

      {/* 3. Panel Desplegable de Filtros Avanzados */}
      {showAdvanced && (
        <div className="p-4 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Filtro por Categoría */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Tag size={12} className="text-blue-500" /> Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="">Todas las categorías ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Marca / Fabricante */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Building2 size={12} className="text-purple-500" /> Marca / Fabricante
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="">Todas las marcas ({brands.length})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Rango de Stock: Min y Max */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Boxes size={12} className="text-emerald-500" /> Rango de Stock Central
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="Mín"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm placeholder-slate-400"
              />
              <span className="text-slate-400 font-bold text-xs">-</span>
              <input
                type="number"
                min="0"
                placeholder="Máx"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm placeholder-slate-400"
              />
            </div>
          </div>

          {/* Acciones de Reseteo */}
          <div className="flex flex-col justify-end">
            <button
              onClick={onClearFilters}
              disabled={activeFiltersCount === 0}
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Limpiar Filtros</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
