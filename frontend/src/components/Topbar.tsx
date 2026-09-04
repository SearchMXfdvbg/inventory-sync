'use client';

import React from 'react';

interface TopbarProps {
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 fixed right-0 top-0 left-64 z-10">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>

      {/* Control panel */}
      <div className="flex items-center gap-4">
      </div>
    </header>
  );
};

export default Topbar;
