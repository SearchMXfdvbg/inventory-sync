import React from 'react';

interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'detail';
  variant?: 'card' | 'table' | 'detail';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = 'card', variant }) => {
  const activeType = variant || type;
  if (activeType === 'table') {
    return (
      <div className="space-y-4 w-full animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-md w-full"></div>
        <div className="h-12 bg-slate-100 dark:bg-slate-900 rounded-md w-full"></div>
        <div className="h-12 bg-slate-100 dark:bg-slate-900 rounded-md w-full"></div>
        <div className="h-12 bg-slate-100 dark:bg-slate-900 rounded-md w-full"></div>
        <div className="h-12 bg-slate-100 dark:bg-slate-900 rounded-md w-full"></div>
        <div className="h-12 bg-slate-100 dark:bg-slate-900 rounded-md w-full"></div>
      </div>
    );
  }

  if (activeType === 'detail') {
    return (
      <div className="space-y-6 w-full animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>
          <div className="h-32 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>
          <div className="h-32 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
          <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/4"></div>
        </div>
      </div>
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3 pt-4"></div>
    </div>
  );
};
export default LoadingSkeleton;
