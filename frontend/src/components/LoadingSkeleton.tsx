import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'table' | 'card' | 'list';
}

export default function LoadingSkeleton({ variant = 'table' }: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard animate-pulse">
        <div className="h-4 bg-[#20242c] rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-[#20242c] rounded w-full mb-2"></div>
        <div className="h-3 bg-[#20242c] rounded w-2/3 mb-2"></div>
        <div className="h-3 bg-[#20242c] rounded w-1/2"></div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-[#0d0e12] border border-[#20242c] rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  // Default table skeleton
  return (
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="h-6 bg-[#20242c] rounded w-64"></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-8 w-24 bg-[#12141a] border border-[#20242c] rounded"></div>
          <div className="h-8 w-24 bg-[#12141a] border border-[#20242c] rounded"></div>
          <div className="h-8 w-32 bg-[#12141a] border border-[#20242c] rounded"></div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 border border-[#20242c] bg-[#0d0e12] shadow-hard">
        <div className="h-8 bg-[#090a0c] border border-[#20242c] rounded w-full md:w-64"></div>
        <div className="h-8 w-20 bg-[#12141a] border border-[#20242c] rounded"></div>
      </div>

      {/* Table Header Skeleton */}
      <div className="grid grid-cols-12 gap-4 mb-2 px-4">
        <div className="col-span-2 h-4 bg-[#20242c] rounded"></div>
        <div className="col-span-4 h-4 bg-[#20242c] rounded"></div>
        <div className="col-span-1 h-4 bg-[#20242c] rounded"></div>
        <div className="col-span-2 h-4 bg-[#20242c] rounded"></div>
        <div className="col-span-2 h-4 bg-[#20242c] rounded"></div>
        <div className="col-span-1 h-4 bg-[#20242c] rounded"></div>
      </div>

      {/* Table Rows Skeleton */}
      <div className="border border-[#20242c] bg-[#0d0e12] shadow-hard">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-[#20242c] last:border-b-0"
          >
            <div className="col-span-2 h-4 bg-[#20242c] rounded"></div>
            <div className="col-span-4 h-4 bg-[#20242c] rounded"></div>
            <div className="col-span-1 h-4 bg-[#20242c] rounded"></div>
            <div className="col-span-2 h-4 bg-[#20242c] rounded"></div>
            <div className="col-span-2 h-4 bg-[#20242c] rounded"></div>
            <div className="col-span-1 h-4 bg-[#20242c] rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}