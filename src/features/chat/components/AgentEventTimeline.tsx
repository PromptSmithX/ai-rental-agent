import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Loader2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { AgentEvent, AgentRunStatus } from '@/domain/contracts';

interface AgentEventTimelineProps {
  events: AgentEvent[];
  runStatus: AgentRunStatus;
}

export const AgentEventTimeline: React.FC<AgentEventTimelineProps> = ({ events, runStatus }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (events.length === 0 && runStatus === 'idle') {
    return null;
  }

  const latestEvent = events[events.length - 1];

  return (
    <div className="w-full my-2 bg-slate-50 border border-slate-200 rounded-card p-2.5 text-xs">
      {/* Timeline Header / Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {runStatus === 'extracting' || runStatus === 'searching' || runStatus === 'ranking' ? (
            <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
          ) : runStatus === 'failed' ? (
            <XCircle className="w-4 h-4 text-red-600" />
          ) : runStatus === 'needs_clarification' ? (
            <HelpCircle className="w-4 h-4 text-amber-600" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-600" />
          )}

          <div className="flex items-center gap-1.5 font-medium text-slate-800">
            <span>Tiến trình AI Agent</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-normal">
              Mô phỏng
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium transition-colors"
          aria-expanded={isExpanded}
        >
          <span>{events.length} bước</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Latest summary status text */}
      {latestEvent && !isExpanded && (
        <div className="mt-1.5 text-slate-600 flex items-center gap-1.5 pl-6">
          <span className="truncate">{latestEvent.label}</span>
          {latestEvent.durationMs && (
            <span className="text-slate-400 font-mono text-[10px]">
              (~{latestEvent.durationMs}ms)
            </span>
          )}
        </div>
      )}

      {/* Expanded Step List */}
      {isExpanded && (
        <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1.5 pl-1">
          {events.map((evt, idx) => (
            <div key={evt.id || idx} className="flex items-start gap-2 text-slate-700">
              <div className="mt-0.5">
                {evt.status === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : evt.status === 'error' ? (
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 truncate">{evt.label}</span>
                  {evt.durationMs && (
                    <span className="text-slate-400 text-[10px] font-mono">
                      {evt.durationMs}ms
                    </span>
                  )}
                </div>

                {evt.details && Object.keys(evt.details).length > 0 && (
                  <div className="text-[11px] text-slate-500 font-mono bg-white/80 rounded px-1.5 py-0.5 mt-0.5 border border-slate-100 truncate">
                    {Object.entries(evt.details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
