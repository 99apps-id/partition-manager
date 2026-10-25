import React, { useState } from 'react'
import { Play, CheckCircle2, Terminal, X } from 'lucide-react'
import { PendingOperation } from '../../types/partition'
import { useDismissModal } from './useDismissModal'

interface ApplyOperationsModalProps {
  operations: PendingOperation[]
  onClose: () => void
  onComplete: () => void
}

export const ApplyOperationsModal: React.FC<ApplyOperationsModalProps> = ({
  operations,
  onClose,
  onComplete,
}) => {
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [currentOpIndex, setCurrentOpIndex] = useState(0)
  const [overallProgress, setOverallProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([
    `[INFO] Prepared ${operations.length} pending partition operations for batch execution.`,
    '[READY] Click "Execute" to commence low-level disk changes.',
  ])
  const [autoShutdown, setAutoShutdown] = useState(false)
  useDismissModal(onClose, !isRunning)

  const startExecution = () => {
    setIsRunning(true)
    setLogs(prev => [...prev, '[START] Locking storage devices & dismounting volumes...'])

    let progress = 0
    let step = 0
    const totalSteps = operations.length * 4

    const interval = setInterval(() => {
      progress += Math.floor(100 / totalSteps)
      step++

      if (step === 1) {
        setLogs(prev => [
          ...prev,
          `[EXEC] Initializing Task 1/${operations.length}: ${operations[0]?.title || 'Processing'}`,
          `[LOG] Locking filesystem and validating sector integrity...`,
        ])
      } else if (step === 2) {
        setLogs(prev => [
          ...prev,
          `[LOG] Relocating cluster allocation tables and journal records...`,
          `[LOG] Writing updated partition boundaries to LBA partition table...`,
        ])
      } else if (step === 3 && operations.length > 1) {
        setCurrentOpIndex(1)
        setLogs(prev => [
          ...prev,
          `[EXEC] Starting Task 2/${operations.length}: ${operations[1]?.title || 'Processing'}`,
          `[LOG] Verifying 4K boundary alignment and cluster structures...`,
        ])
      } else if (step >= totalSteps) {
        clearInterval(interval)
        setOverallProgress(100)
        setIsRunning(false)
        setIsFinished(true)
        setLogs(prev => [
          ...prev,
          '[SUCCESS] All partition structures successfully synchronized!',
          '[SUCCESS] Filesystem mounted cleanly. Changes applied to disk.',
        ])
      } else {
        setOverallProgress(Math.min(95, progress))
      }
    }, 450)
  }

  const handleFinish = () => {
    onComplete()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (!isRunning && e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Execute Operations</h3>
              <p className="text-xs text-slate-500">
                {operations.length} queued task{operations.length > 1 ? 's' : ''} to apply
              </p>
            </div>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Operations List */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 max-h-36 overflow-y-auto space-y-1.5 text-xs">
            {operations.map((op, idx) => (
              <div
                key={op.id}
                className={`p-2 rounded-md flex items-center justify-between border ${
                  idx === currentOpIndex && isRunning
                    ? 'border-blue-400 bg-blue-50 text-blue-900 font-semibold'
                    : idx < currentOpIndex || isFinished
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] font-mono flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span>{op.title}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">
                  {op.description}
                </span>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span className="font-medium">
                {isFinished ? 'Completed' : isRunning ? 'Applying Changes...' : 'Ready'}
              </span>
              <span className="font-mono text-blue-700 font-bold">{overallProgress}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isFinished ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Log Window */}
          <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 font-mono text-[11px] text-slate-200 h-32 overflow-y-auto space-y-0.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] pb-1 border-b border-slate-800 mb-1">
              <Terminal className="w-3 h-3" />
              <span>DISPATCH LOG</span>
            </div>
            {logs.map((log, i) => (
              <div key={i} className="leading-tight">
                {log.startsWith('[SUCCESS]') ? (
                  <span className="text-emerald-400 font-bold">{log}</span>
                ) : log.startsWith('[EXEC]') ? (
                  <span className="text-blue-400">{log}</span>
                ) : (
                  <span className="text-slate-300">{log}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoShutdown}
                onChange={(e) => setAutoShutdown(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <span>Shut down computer after completion</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          {!isFinished ? (
            <>
              <button
                type="button"
                disabled={isRunning}
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRunning}
                onClick={startExecution}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunning ? 'Executing...' : 'Execute'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
