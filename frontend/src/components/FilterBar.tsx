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
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between transition-colors">
      <div className="relative w-full md:max-w-md">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          <Search size={18} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por SKU o Nombre..."
          className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
          <SlidersHorizontal size={14} />
          <span>Filtros Rápidos</span>
        </div>
        
        <button
          onClick={() => setFilterStockBajo(!filterStockBajo)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            filterStockBajo
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 shadow-sm'
              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          Stock Bajo (&lt; 5)
        </button>

        {filterDesincronizado !== undefined && setFilterDesincronizado !== undefined && (
          <button
            onClick={() => setFilterDesincronizado(!filterDesincronizado)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              filterDesincronizado
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 shadow-sm'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
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
