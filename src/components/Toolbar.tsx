import React from 'react'
import {
  Layers,
  Copy,
  Activity,
  HeartPulse,
  Gauge,
  SlidersHorizontal,
  Undo2,
  Redo2,
  Trash2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { ActiveTab, Disk, ModalState, Partition, PendingOperation } from '../types/partition'

interface ToolbarProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  pendingOperations: PendingOperation[]
  undoStack: PendingOperation[][]
  redoStack: PendingOperation[][]
  onUndo: () => void
  onRedo: () => void
  onDiscard: () => void
  onApply: () => void
  onRefresh: () => void
  selectedDisk?: Disk
  selectedPartition: Partition | null
  onOpenModal: (type: ModalState['type']) => void
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTab,
  setActiveTab,
  pendingOperations,
  undoStack,
  redoStack,
  onUndo,
  onRedo,
  onDiscard,
  onApply,
  onRefresh,
}) => {
  const pending = pendingOperations.length

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'manager', label: 'Partition Manager', icon: <Layers className="w-[18px] h-[18px]" /> },
    { id: 'clone', label: 'Disk Clone', icon: <Copy className="w-[18px] h-[18px]" /> },
    { id: 'surface-test', label: 'Surface Test', icon: <Activity className="w-[18px] h-[18px]" /> },
    { id: 'smart-health', label: 'Disk Health', icon: <HeartPulse className="w-[18px] h-[18px]" /> },
    { id: 'benchmark', label: 'Benchmark', icon: <Gauge className="w-[18px] h-[18px]" /> },
    { id: 'alignment', label: '4K Alignment', icon: <SlidersHorizontal className="w-[18px] h-[18px]" /> },
  ]

  return (
    <header className="bg-white text-slate-900 select-none shrink-0 z-30 shadow-sm border-b border-slate-200">
      {/* Top brand row */}
      <div className="h-14 px-5 flex items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <span className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src="/partition-manager-icon.png"
              alt="Partition Manager"
              className="w-14 h-14 object-contain"
            />
          </span>
          <div className="leading-tight">
            <h1 className="text-[15px] font-bold tracking-tight">Partition Manager</h1>
            <p className="text-[11px] text-sky-600 font-medium tracking-wide">PROFESSIONAL EDITION</p>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-200 mx-1 shrink-0" />

        {/* Module tabs */}
        <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto" aria-label="Modules">
          {tabs.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative h-11 px-3.5 rounded-lg text-[13px] font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-400 ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className={active ? 'text-blue-600' : 'text-slate-400'}>{tab.icon}</span>
                <span>{tab.label}</span>
                {active && (
                  <span className="absolute left-3 right-3 -bottom-[3px] h-[3px] rounded-full bg-blue-600" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Operation controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-lg bg-slate-100 border border-slate-200 p-0.5">
            <button
              onClick={onUndo}
              disabled={undoStack.length === 0}
              title="Undo staged operation"
              className={`h-8 px-2.5 rounded-md text-[13px] font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 ${
                undoStack.length > 0
                  ? 'text-slate-700 hover:bg-slate-200 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden xl:inline">Undo</span>
            </button>
            <button
              onClick={onRedo}
              disabled={redoStack.length === 0}
              title="Redo staged operation"
              className={`h-8 px-2.5 rounded-md text-[13px] font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 ${
                redoStack.length > 0
                  ? 'text-slate-700 hover:bg-slate-200 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-4 h-4" />
              <span className="hidden xl:inline">Redo</span>
            </button>
          </div>

          <button
            onClick={onDiscard}
            disabled={pending === 0}
            title="Discard all staged operations"
            className={`h-9 px-3 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 border transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 ${
              pending > 0
                ? 'border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer'
                : 'border-slate-200 text-slate-300 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden xl:inline">Discard</span>
          </button>

          <button
            onClick={onRefresh}
            title="Rescan hardware"
            className="h-9 px-3 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden xl:inline">Rescan</span>
          </button>

          <button
            onClick={onApply}
            disabled={pending === 0}
            title={pending > 0 ? `Apply ${pending} staged operation${pending > 1 ? 's' : ''} to disk (Ctrl+Enter)` : 'Stage an operation first'}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && pending > 0) onApply()
            }}
            className={`h-9 pl-3.5 pr-2 rounded-lg text-[13px] font-bold flex items-center gap-2 transition-all focus-visible:outline-2 focus-visible:outline-amber-300 ${
              pending > 0
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_2px_12px_rgba(251,191,36,0.45)] cursor-pointer active:scale-[0.98]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-[18px] h-[18px]" />
            <span>Apply</span>
            <span
              className={`min-w-6 h-6 px-1.5 rounded-md text-xs font-extrabold font-mono flex items-center justify-center ${
                pending > 0 ? 'bg-slate-950 text-amber-300' : 'bg-white/10 text-white/35'
              }`}
            >
              {pending}
            </span>
          </button>
        </div>
      </div>

      {/* Pending ops ticker */}
      {pending > 0 && (
        <div className="h-8 px-5 flex items-center gap-2 bg-slate-50 border-t border-slate-200 text-[12px]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-slate-700 font-semibold">
            {pending} operation{pending > 1 ? 's' : ''} staged
          </span>
          <span className="text-slate-400 font-medium hidden sm:inline">
            Nothing has changed on disk yet — press Apply to execute.
          </span>
        </div>
      )}
    </header>
  )
}
