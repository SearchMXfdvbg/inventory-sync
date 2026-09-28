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
    <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] shadow-hard rounded-none font-mono-code text-xs transition-colors">
      {/* 1. Barra Principal: Búsqueda Universal + Ordenamiento + Filtros Avanzados */}
      <div className="p-3.5 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between border-b border-slate-200 dark:border-[#20242c]">
        {/* Input de Búsqueda */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-[#8e95a5]">
            <Search size={15} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="BUSCAR POR SKU, NOMBRE, MARCA, CÓDIGO..."
            className="pl-9 pr-9 py-2 w-full border border-slate-300 dark:border-[#20242c] rounded-none text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555d6e] bg-slate-50 dark:bg-[#090a0c] focus:outline-none focus:border-[#00ff66] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Controles de Acción Rápida: Ordenar, Ítems por pág, Toggle Avanzado */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Ordenamiento */}
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-slate-400 dark:text-[#8e95a5] pointer-events-none">
              <ArrowUpDown size={13} />
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-7 pr-7 py-2 text-xs font-bold bg-slate-50 dark:bg-[#090a0c] border border-slate-300 dark:border-[#20242c] rounded-none text-slate-800 dark:text-[#ededed] focus:outline-none focus:border-[#00ff66] cursor-pointer appearance-none"
            >
              <option value="name_asc">NOMBRE: A → Z</option>
              <option value="name_desc">NOMBRE: Z → A</option>
              <option value="sku_asc">SKU: A → Z</option>
              <option value="sku_desc">SKU: Z → A</option>
              <option value="stock_desc">MAYOR STOCK (↓)</option>
              <option value="stock_asc">MENOR STOCK (↑)</option>
              <option value="price_desc">MAYOR PRECIO (↓)</option>
              <option value="price_asc">MENOR PRECIO (↑)</option>
            </select>
            <ChevronDown size={13} className="absolute right-2 text-slate-400 dark:text-[#8e95a5] pointer-events-none" />
          </div>

          {/* Selector de Ítems por Página */}
          <div className="relative flex items-center">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-[#090a0c] border border-slate-300 dark:border-[#20242c] rounded-none text-slate-800 dark:text-[#ededed] focus:outline-none focus:border-[#00ff66] cursor-pointer appearance-none pr-6"
            >
              <option value={10}>10 / PÁG</option>
              <option value={25}>25 / PÁG</option>
              <option value={50}>50 / PÁG</option>
              <option value={100}>100 / PÁG</option>
              <option value={200}>200 (TODOS)</option>
            </select>
            <ChevronDown size={13} className="absolute right-1.5 text-slate-400 dark:text-[#8e95a5] pointer-events-none" />
          </div>

          {/* Toggle de Filtros Avanzados */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-none text-xs font-bold transition-all border cursor-pointer ${
              showAdvanced || activeFiltersCount > 0
                ? 'bg-slate-900 dark:bg-[#20242c] text-[#008f39] dark:text-[#00ff66] border-[#00ff66] shadow-hard'
                : 'bg-slate-50 dark:bg-[#090a0c] border-slate-300 dark:border-[#20242c] text-slate-700 dark:text-[#8e95a5] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>FILTROS</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#00ff66] text-black text-[10px] font-extrabold ml-0.5">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Botón Limpiar Todo */}
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-none text-xs font-bold text-rose-600 dark:text-[#ff3b00] border border-rose-300 dark:border-[#ff3b00]/50 bg-rose-50 dark:bg-[#ff3b00]/10 transition-colors cursor-pointer"
              title="Restablecer filtros"
            >
              <RotateCcw size={12} />
              <span>RESET</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Pestañas de Filtros Rápidos */}
      <div className="p-2.5 bg-slate-50 dark:bg-[#090a0c] flex items-center gap-2 overflow-x-auto scrollbar-none">
        {[
          { key: 'all', label: 'TODOS', count: counts.total, icon: Layers },
          { key: 'instock', label: 'EN STOCK', count: counts.inStock, icon: CheckCircle2 },
          { key: 'lowstock', label: 'STOCK BAJO', count: counts.lowStock, icon: AlertTriangle },
          { key: 'outofstock', label: 'AGOTADOS', count: counts.outOfStock, icon: PackageX },
          { key: 'overstock', label: 'SOBRE-STOCK', count: counts.overStock, icon: Boxes },
        ].map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setQuickFilter(key)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-bold transition-all cursor-pointer border ${
              quickFilter === key
                ? 'bg-slate-900 dark:bg-[#181b22] text-[#008f39] dark:text-[#00ff66] border-[#00ff66] shadow-hard'
                : 'bg-white dark:bg-[#0d0e12] border-slate-300 dark:border-[#20242c] text-slate-600 dark:text-[#8e95a5] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Icon size={13} />
            <span>{label}</span>
            <span className={`px-1 py-0.2 text-[10px] font-extrabold border ${
              quickFilter === key 
                ? 'border-[#00ff66] text-[#008f39] dark:text-[#00ff66]' 
                : 'border-slate-300 dark:border-[#20242c] text-slate-500 dark:text-[#8e95a5]'
            }`}>
              {count}
            </span>
          </button>
        ))}

        {counts.desync > 0 && (
          <button
            onClick={() => setQuickFilter('desync')}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-bold transition-all cursor-pointer border ${
              quickFilter === 'desync'
                ? 'bg-slate-900 dark:bg-[#181b22] text-[#ff3b00] border-[#ff3b00] shadow-hard'
                : 'bg-white dark:bg-[#0d0e12] border-[#ff3b00]/40 text-[#ff3b00]'
            }`}
          >
            <AlertTriangle size={13} />
            <span>DESFASADOS</span>
            <span className="px-1 py-0.2 text-[10px] font-extrabold border border-[#ff3b00]/40">
              {counts.desync}
            </span>
          </button>
        )}
      </div>

      {/* 3. Panel Desplegable de Filtros Avanzados */}
      {showAdvanced && (
        <div className="p-4 bg-slate-50 dark:bg-[#090a0c] border-t border-slate-200 dark:border-[#20242c] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1.5 flex items-center gap-1">
              <Tag size={12} className="text-[#00ff66]" /> CATEGORÍA
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-[#0d0e12] border border-slate-300 dark:border-[#20242c] rounded-none text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
            >
              <option value="">TODAS ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1.5 flex items-center gap-1">
              <Building2 size={12} className="text-[#00ff66]" /> MARCA / FABRICANTE
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-[#0d0e12] border border-slate-300 dark:border-[#20242c] rounded-none text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
            >
              <option value="">TODAS ({brands.length})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1.5 flex items-center gap-1">
              <Boxes size={12} className="text-[#00ff66]" /> RANGO STOCK CENTRAL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="MÍN"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-[#0d0e12] border border-slate-300 dark:border-[#20242c] rounded-none text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
              />
              <span className="text-slate-500 font-bold">-</span>
              <input
                type="number"
                min="0"
                placeholder="MÁX"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-[#0d0e12] border border-slate-300 dark:border-[#20242c] rounded-none text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={onClearFilters}
              disabled={activeFiltersCount === 0}
              className="w-full px-3.5 py-2 text-xs font-bold rounded-none border border-slate-300 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] text-slate-700 dark:text-[#8e95a5] hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-hard flex items-center justify-center gap-1.5 uppercase"
            >
              <RotateCcw size={12} />
              <span>LIMPIAR FILTROS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
