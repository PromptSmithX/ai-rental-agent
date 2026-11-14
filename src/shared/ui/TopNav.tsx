import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, GraduationCap, Home } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';

export const TopNav: React.FC = () => {
  const location = useLocation();
  const { currentFilters, allCampuses, updateFilters } = useSearchStore();

  return (
    <header className="sticky top-0 z-40 w-full h-15 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6">
      {/* Brand & Campus Context */}
      <div className="flex items-center gap-5">
        <Link
          to="/"
          className="flex items-center gap-2.5 group transition-colors"
          aria-label="Return to TroMate Home"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold tracking-tight text-sm shadow-xs group-hover:bg-slate-800 transition-colors">
            TM
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
              TroMate <span className="font-normal text-slate-500">Living</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">
              Verified Student Rentals
            </span>
          </div>
        </Link>

        {/* Campus Context Dropdown */}
        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200 text-xs">
          <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-400 font-medium">Campus:</span>
          <select
            value={currentFilters.campusId || ''}
            onChange={(e) => updateFilters({ campusId: e.target.value || null })}
            className="bg-transparent font-medium text-slate-800 hover:text-slate-950 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 rounded px-1.5 py-0.5 border border-transparent hover:border-slate-200 text-xs"
            aria-label="Select Target University Campus"
          >
            <option value="">All Campuses</option>
            {allCampuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.universityName} — {c.campusName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            location.pathname === '/'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        <Link
          to="/workspace"
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            location.pathname.startsWith('/workspace')
              ? 'bg-slate-900 text-white font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Browse Rentals</span>
        </Link>
      </div>
    </header>
  );
};
