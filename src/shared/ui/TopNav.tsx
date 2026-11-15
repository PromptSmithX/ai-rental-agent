import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, GraduationCap, Home, Sparkles } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';

export const TopNav: React.FC = () => {
  const location = useLocation();
  const { currentFilters, allCampuses, updateFilters } = useSearchStore();

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      {/* Brand & Campus Context */}
      <div className="flex items-center gap-4 sm:gap-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 group transition-transform active:scale-95"
          aria-label="TroMate Home"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold tracking-tight text-xs shadow-sm ring-1 ring-slate-900/10 group-hover:bg-slate-800 transition-colors">
            TM
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
              TroMate <span className="font-semibold text-teal-600">Copilot</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
              Tìm trọ sinh viên AI
            </span>
          </div>
        </Link>

        {/* Campus Context Dropdown */}
        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200 text-xs">
          <GraduationCap className="w-4 h-4 text-slate-500" />
          <span className="text-slate-500 font-medium">Cơ sở:</span>
          <select
            value={currentFilters.campusId || ''}
            onChange={(e) => updateFilters({ campusId: e.target.value || null })}
            className="bg-slate-50 font-medium text-slate-800 hover:text-slate-950 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300 rounded-md px-2 py-1 border border-slate-200/80 text-xs transition-colors"
            aria-label="Chọn cơ sở trường học"
          >
            <option value="">Tất cả cơ sở</option>
            {allCampuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.universityName} — {c.campusName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Subtle Simulation Badge */}
        <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70 text-[11px] font-medium">
          <Sparkles className="w-3 h-3 text-teal-600" />
          <span>AI mô phỏng · Dữ liệu minh họa</span>
        </div>

        <Link
          to="/"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            location.pathname === '/'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Trang chủ</span>
        </Link>

        <Link
          to="/workspace"
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            location.pathname.startsWith('/workspace')
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-teal-400" />
          <span>Bản đồ & Tìm trọ</span>
        </Link>
      </div>
    </header>
  );
};
