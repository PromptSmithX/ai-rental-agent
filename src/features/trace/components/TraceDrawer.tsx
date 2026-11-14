import React, { useState } from 'react';
import {
  CheckCircle2,
  Code,
  Copy,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import { useSearchStore } from '@/app/store/searchStore';

export const TraceDrawer: React.FC = () => {
  const {
    isTraceOpen,
    setTraceOpen,
    events,
    runStatus,
    currentFilters,
    lastSearchResult,
    isSimulation,
  } = useSearchStore();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'json'>('events');
  const [copied, setCopied] = useState(false);

  if (!isTraceOpen) return null;

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? events[events.length - 1];

  const fullTracePayload = {
    simulationMode: isSimulation,
    runStatus,
    appliedFilters: currentFilters,
    totalHits: lastSearchResult?.totalMatched ?? 0,
    eventTimeline: events,
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(fullTracePayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-950 text-slate-100 shadow-2xl flex flex-col border-l border-slate-800 animate-in slide-in-from-right duration-200"
      aria-label="Developer Agent Trace Drawer"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-amber-400" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                Agent Trace Stream
              </h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono">
                SIMULATION
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Observable milestone events and state transitions
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTraceOpen(false)}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          aria-label="Close trace drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 px-4 bg-slate-900 text-xs font-mono shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`py-2 px-3 border-b-2 font-medium transition-colors ${
            activeTab === 'events'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Events Stream ({events.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('json')}
          className={`py-2 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'json'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Raw State JSON</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'events' ? (
          <div>
            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No agent events recorded yet in this active session.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((evt) => {
                  const isSelected = selectedEvent?.id === evt.id;
                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEventId(evt.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-slate-900 border-amber-500/50 text-white'
                          : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                        <div className="flex items-center gap-1.5">
                          {evt.status === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span className="font-semibold text-amber-300">{evt.type}</span>
                        </div>
                        {evt.durationMs && (
                          <span className="text-slate-400 text-[10px]">
                            ~{evt.durationMs}ms (sim)
                          </span>
                        )}
                      </div>

                      <div className="text-slate-300 text-xs">{evt.label}</div>

                      {evt.details && Object.keys(evt.details).length > 0 && (
                        <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[10px] text-slate-400 overflow-x-auto">
                          {JSON.stringify(evt.details, null, 2)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono text-slate-400">Canonical Search & Agent State</span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-mono transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed">
              {JSON.stringify(fullTracePayload, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 text-[11px] font-mono text-slate-400 flex items-center justify-between shrink-0">
        <span>Run Status: <strong className="text-amber-400">{runStatus}</strong></span>
        <span>Simulation: <strong>{String(isSimulation)}</strong></span>
      </div>
    </aside>
  );
};
