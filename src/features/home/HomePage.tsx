import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Compass, GraduationCap, MapPin, Search, ShieldCheck } from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';

const POPULAR_SEARCHES = [
  {
    title: 'Near HCMUT LTK Campus',
    prompt: 'Find rooms under 3M VND around HCMUT Ly Thuong Kiet within 2 km with air conditioning',
    badge: '≤ 3M / mo',
  },
  {
    title: 'Pet-friendly Living',
    prompt: 'Studio room with air conditioning, balcony and allows cats near campus',
    badge: 'Pet friendly',
  },
  {
    title: 'Budget Rooms',
    prompt: 'Cheap student room under 2.5 million VND near university gate',
    badge: '≤ 2.5M / mo',
  },
  {
    title: 'Room Comparison',
    prompt: 'Compare the first two available rooms near the campus gate',
    badge: 'Compare top 2',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { sendUserMessage, allCampuses, currentFilters, updateFilters } = useSearchStore();
  const [promptText, setPromptText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    const query = promptText.trim();
    navigate('/workspace');
    await sendUserMessage(query);
  };

  const handleSelectExample = async (examplePrompt: string) => {
    navigate('/workspace');
    await sendUserMessage(examplePrompt);
  };

  return (
    <div className="min-h-[calc(100vh-3.75rem)] flex flex-col justify-between bg-[#FAFAFA]">
      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-12 pb-16 flex flex-col items-center justify-center text-center">
        {/* Top Product Tag */}
        <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200/80 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Curated University Housing</span>
        </div>

        {/* Clean Editorial Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 max-w-2xl leading-[1.15] mb-4">
          Find your ideal student rental near campus.
        </h1>

        <p className="max-w-xl text-sm sm:text-base text-slate-600 mb-8 leading-relaxed font-normal">
          Search verified student housing by budget, distance, and amenities. Chat naturally to discover rooms and explore them live on the map.
        </p>

        {/* Campus Selection Bar */}
        <div className="w-full max-w-2xl mb-5 flex items-center justify-center gap-2 text-xs text-slate-500">
          <GraduationCap className="w-4 h-4 text-slate-700" />
          <span className="font-medium text-slate-700">Select Campus:</span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {allCampuses.map((campus) => {
              const isSelected = currentFilters.campusId === campus.id;
              return (
                <button
                  key={campus.id}
                  type="button"
                  onClick={() => updateFilters({ campusId: campus.id })}
                  className={`px-3 py-1 rounded-md text-xs transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white font-medium shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400 hover:text-slate-900'
                  }`}
                >
                  {campus.campusName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Studio Composer */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 transition-all mb-6 text-left"
        >
          <div className="relative">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="What kind of room are you looking for? (e.g. Under 3M VND near HCMUT within 2 km, air conditioning, cat friendly...)"
              rows={3}
              className="w-full p-1.5 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent resize-none focus:outline-none leading-relaxed"
              aria-label="Enter rental search request"
            />
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Real-time availability • Direct map sync</span>
            </div>

            <button
              type="submit"
              disabled={!promptText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Rooms</span>
            </button>
          </div>
        </form>

        {/* Curated Popular Searches */}
        <div className="w-full max-w-2xl text-left">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-700">
              Popular Searches
            </span>
            <span className="text-[11px] text-slate-400">Click to explore</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {POPULAR_SEARCHES.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectExample(item.prompt)}
                className="text-left bg-white text-slate-700 hover:text-slate-950 hover:border-slate-400 border border-slate-200 p-3 rounded-lg transition-all group flex flex-col justify-between shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-xs text-slate-900">{item.title}</span>
                  <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  "{item.prompt}"
                </p>
                <div className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-slate-900">
                  <span>Explore rooms</span>
                  <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Product Value Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl mt-12 text-left">
          <div className="p-4 rounded-lg bg-white border border-slate-200">
            <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center mb-2.5 font-bold">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-xs text-slate-900 mb-1">
              Synchronized Map & Listings
            </h2>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every search updates coordinate pins and room cards simultaneously for effortless visual discovery.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200">
            <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center mb-2.5 font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-xs text-slate-900 mb-1">
              Campus Proximity
            </h2>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Calculates accurate walking and straight-line distances from university gates to ensure an easy daily commute.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200">
            <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center mb-2.5 font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-xs text-slate-900 mb-1">
              Transparent Pricing
            </h2>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Transparent monthly rents with itemized estimates for electricity, water, and parking upfront.
            </p>
          </div>
        </div>
      </main>

      {/* Clean Studio Footer */}
      <footer className="w-full py-4 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <span>© 2026 TroMate Inc. All rights reserved.</span>
          <span className="text-slate-400">
            Verified student housing discovery platform.
          </span>
        </div>
      </footer>
    </div>
  );
};
