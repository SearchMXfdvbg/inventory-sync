import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStockBajo: boolean;
  setFilterStockBajo: (val: boolean) => void;
  filterDesincronizado?: boolean;
  setFilterDesincronizado?: (val: boolean) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  filterStockBajo,
  setFilterStockBajo,
  filterDesincronizado,
  setFilterDesincronizado,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
      <div className="relative w-full md:max-w-md">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search size={18} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por SKU o Nombre..."
          className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
          <SlidersHorizontal size={14} />
          <span>Filtros Rápidos</span>
        </div>
        
        <button
          onClick={() => setFilterStockBajo(!filterStockBajo)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            filterStockBajo
              ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Stock Bajo (&lt; 5)
        </button>

        {filterDesincronizado !== undefined && setFilterDesincronizado !== undefined && (
          <button
            onClick={() => setFilterDesincronizado(!filterDesincronizado)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              filterDesincronizado
                ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Desincronizado
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
