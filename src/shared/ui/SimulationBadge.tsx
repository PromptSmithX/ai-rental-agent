import React from 'react';
import { Sparkles } from 'lucide-react';

interface SimulationBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export const SimulationBadge: React.FC<SimulationBadgeProps> = ({ size = 'md', className = '' }) => {
  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
        title="Toàn bộ luồng agent và dữ liệu hiện là mô phỏng (Demo)"
      >
        <Sparkles className="w-3 h-3 text-amber-600" />
        AI mô phỏng · Dữ liệu minh họa
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs ${className}`}
      title="Toàn bộ luồng agent và dữ liệu phòng hiện tại là mô phỏng (Demo)"
    >
      <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
      <span>AI mô phỏng</span>
      <span className="text-amber-400">·</span>
      <span className="text-amber-700">Dữ liệu minh họa</span>
    </div>
  );
};
