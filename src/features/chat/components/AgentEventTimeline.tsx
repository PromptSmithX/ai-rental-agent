import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Loader2,
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
  const isRunning = runStatus === 'extracting' || runStatus === 'searching' || runStatus === 'ranking';

  return (
    <div className="w-full my-2 bg-white border border-slate-200/90 rounded-xl p-3 text-xs shadow-xs transition-all">
      {/* Timeline Header / Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping absolute" />
              <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin relative" />
            </div>
          ) : runStatus === 'failed' ? (
            <XCircle className="w-4 h-4 text-rose-600" />
          ) : runStatus === 'needs_clarification' ? (
            <HelpCircle className="w-4 h-4 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}

          <div className="flex items-center gap-1.5 font-medium text-slate-800">
            <span className="font-bold text-slate-900 text-xs">Tiến trình AI Agent</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.2 rounded">
              Mô phỏng
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 font-medium transition-colors text-[11px] cursor-pointer"
          aria-expanded={isExpanded}
        >
          <span>{events.length} bước xử lý</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Latest summary status text */}
      {latestEvent && !isExpanded && (
        <div className="mt-2 text-slate-600 flex items-center justify-between text-[11px] pl-6 pt-1 border-t border-slate-100">
          <span className="truncate font-medium text-slate-700">{latestEvent.label}</span>
          {latestEvent.durationMs && (
            <span className="text-slate-400 font-mono text-[10px] shrink-0 ml-2">
              ~{latestEvent.durationMs}ms
            </span>
          )}
        </div>
      )}

      {/* Expanded Step List */}
      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2 pl-1">
          {events.map((evt, idx) => (
            <div key={evt.id || idx} className="flex items-start gap-2.5 text-slate-700 text-xs">
              <div className="mt-0.5 shrink-0">
                {evt.status === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : evt.status === 'error' ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-slate-800 truncate text-[11px]">{evt.label}</span>
                  {evt.durationMs && (
                    <span className="text-slate-400 text-[10px] font-mono shrink-0">
                      {evt.durationMs}ms
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
