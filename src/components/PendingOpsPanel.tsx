import React from 'react'
import { ClipboardList, Play, Trash2, Undo2, Redo2 } from 'lucide-react'
import { PendingOperation } from '../types/partition'

interface PendingOpsPanelProps {
  operations: PendingOperation[]
  undoCount: number
  redoCount: number
  onUndo: () => void
  onRedo: () => void
  onDiscard: () => void
  onApply: () => void
}

export const PendingOpsPanel: React.FC<PendingOpsPanelProps> = ({
  operations,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  onDiscard,
  onApply,
}) => {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] overflow-hidden" aria-label="Pending operations">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="w-4 h-4 text-blue-700 shrink-0" />
          <h3 className="text-[13px] font-bold text-slate-800 tracking-tight whitespace-nowrap">Pending Operations</h3>
          <span className={`min-w-6 h-5 px-1.5 rounded-md text-[11px] font-extrabold font-mono flex items-center justify-center ${operations.length > 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-500'}`}>
            {operations.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onUndo}
            disabled={undoCount === 0}
            title="Undo last staged operation"
            className="h-7 px-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/70 disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <button
            onClick={onRedo}
            disabled={redoCount === 0}
            title="Redo staged operation"
            className="h-7 px-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/70 disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Redo2 className="w-3.5 h-3.5" /> Redo
          </button>
          <button
            onClick={onDiscard}
            disabled={operations.length === 0}
            title="Discard all staged operations"
            className="h-7 px-2 rounded-md text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-rose-600"
          >
            <Trash2 className="w-3.5 h-3.5" /> Discard
          </button>
        </div>
      </div>

      {operations.length === 0 ? (
        <div className="px-4 py-4 text-[12px] text-slate-500 leading-relaxed max-w-[72ch]">
          No staged operations. Resize, format, delete, or clone actions are queued here first.
          <span className="text-slate-700 font-semibold"> Nothing touches the disk until you press Apply.</span>
        </div>
      ) : (
        <>
          <ol className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
            {operations.map((op, idx) => (
              <li key={op.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="w-5 h-5 rounded-md bg-blue-700 text-white text-[10px] font-extrabold font-mono flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-slate-800 truncate">{op.title}</p>
                  <p className="text-[11px] text-slate-500 truncate font-mono">{op.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end">
            <button
              onClick={onApply}
              className="h-9 px-4 rounded-lg text-[13px] font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-sm flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-amber-600"
            >
              <Play className="w-4 h-4" />
              Apply {operations.length} Change{operations.length > 1 ? 's' : ''}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
