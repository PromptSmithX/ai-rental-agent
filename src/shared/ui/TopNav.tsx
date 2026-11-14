import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Bug, Compass, GraduationCap, Home } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';
import { SimulationBadge } from './SimulationBadge';

export const TopNav: React.FC = () => {
  const location = useLocation();
  const { isTraceOpen, setTraceOpen, currentFilters, allCampuses, updateFilters, isSimulation } =
    useSearchStore();

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-surface/95 backdrop-blur-md border-b border-borderMuted flex items-center justify-between px-4 sm:px-6">
      {/* Brand & Campus */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-bold text-lg text-textPrimary hover:text-brand-600 transition-colors"
          aria-label="Về trang chủ AI Rental Copilot"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight tracking-tight font-extrabold text-brand-900">
              AI Rental <span className="text-brand-600">Copilot</span>
            </span>
            <span className="text-[10px] text-textMuted font-medium uppercase tracking-wider">
              Sinh viên TP.HCM
            </span>
          </div>
        </Link>

        {/* Campus Context Dropdown / Indicator */}
        <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-borderMuted text-xs text-textMuted">
          <GraduationCap className="w-4 h-4 text-brand-600" />
          <select
            value={currentFilters.campusId || ''}
            onChange={(e) => updateFilters({ campusId: e.target.value || null })}
            className="bg-transparent font-medium text-textPrimary hover:text-brand-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 rounded px-1 py-0.5"
            aria-label="Chọn cơ sở trường"
          >
            <option value="">Chưa chọn trường</option>
            {allCampuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.universityName} - {c.campusName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center simulation badge — only shown while actually running on mock/simulated AI */}
      {isSimulation && (
        <div className="hidden lg:block">
          <SimulationBadge />
        </div>
      )}

      {/* Nav Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            location.pathname === '/'
              ? 'bg-brand-50 text-brand-700'
              : 'text-textMuted hover:bg-slate-100'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Trang chủ</span>
        </Link>

        <Link
          to="/workspace"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            location.pathname.startsWith('/workspace')
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-textMuted hover:bg-slate-100'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Workspace</span>
        </Link>

        {/* Dev Trace Toggle */}
        <button
          type="button"
          onClick={() => setTraceOpen(!isTraceOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isTraceOpen
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-borderMuted hover:bg-slate-50'
          }`}
          title="Bật/Tắt Agent Trace Panel dành cho Developer"
          aria-label="Bật/Tắt Developer Trace"
        >
          <Bug className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Trace</span>
        </button>
      </div>
    </header>
  );
};
