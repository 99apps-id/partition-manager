import React, { useState } from 'react'
import { Play, CheckCircle2, AlertTriangle, Terminal, X } from 'lucide-react'
import { PendingOperation } from '../../types/partition'
import { useDismissModal } from './useDismissModal'

export interface ApplyExecutionResult {
  logs: string[]
  succeededIds: string[]
  failed: boolean
}

interface ApplyOperationsModalProps {
  operations: PendingOperation[]
  /**
   * Executes the staged operations for real (desktop) or as a labeled
   * simulation (browser demo). The modal never invents progress or success:
   * the log lines shown are exactly what the executor reports.
   */
  onExecute: (operations: PendingOperation[]) => Promise<ApplyExecutionResult>
  onClose: () => void
}

export const ApplyOperationsModal: React.FC<ApplyOperationsModalProps> = ({
  operations,
  onExecute,
  onClose,
}) => {
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [failed, setFailed] = useState(false)
  const [succeededIds, setSucceededIds] = useState<string[]>([])
  const [failedIds, setFailedIds] = useState<string[]>([])
  const [logs, setLogs] = useState<string[]>([
    `[INFO] Prepared ${operations.length} pending partition operation${operations.length > 1 ? 's' : ''}.`,
    '[READY] Nothing has been written to disk yet. Click "Execute" to apply these changes for real.',
    '[WARN] Partition changes can cause data loss. Make sure you have a backup of important data.',
  ])
  useDismissModal(onClose, !isRunning)

  const startExecution = async () => {
    setIsRunning(true)
    setLogs(prev => [...prev, '[START] Executing operations...'])
    try {
      const result = await onExecute(operations)
      setSucceededIds(result.succeededIds)
      const succeeded = new Set(result.succeededIds)
      setFailedIds(operations.filter(op => !succeeded.has(op.id)).map(op => op.id))
      setFailed(result.failed)
      setLogs(prev => [...prev, ...result.logs])
    } catch (err) {
      setFailed(true)
      setFailedIds(operations.map(op => op.id))
      setLogs(prev => [...prev, `[ERROR] ${err instanceof Error ? err.message : String(err)}`])
    } finally {
      setIsRunning(false)
      setIsFinished(true)
    }
  }

  const opState = (op: PendingOperation): 'pending' | 'done' | 'failed' => {
    if (succeededIds.includes(op.id)) return 'done'
    if (failedIds.includes(op.id)) return 'failed'
    return 'pending'
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
            {operations.map((op, idx) => {
              const state = opState(op)
              return (
                <div
                  key={op.id}
                  className={`p-2 rounded-md flex items-center justify-between border ${
                    state === 'done'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : state === 'failed'
                      ? 'border-red-300 bg-red-50 text-red-800'
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
                    {state === 'done' ? 'Completed' : state === 'failed' ? 'Failed / skipped' : op.description}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Status line (no fake progress: execution is synchronous per operation) */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            {isRunning ? (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="font-medium">Applying changes to disk. Do not close the application...</span>
              </>
            ) : isFinished ? (
              failed ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span className="font-medium text-red-700">
                    Finished with errors. Succeeded operations stay applied; failed ones remain in the queue.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-medium text-emerald-700">All operations completed. Disk list has been rescanned.</span>
                </>
              )
            ) : (
              <span className="font-medium">Ready</span>
            )}
          </div>

          {/* Log Window */}
          <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 font-mono text-[11px] text-slate-200 h-36 overflow-y-auto space-y-0.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] pb-1 border-b border-slate-800 mb-1">
              <Terminal className="w-3 h-3" />
              <span>EXECUTION LOG</span>
            </div>
            {logs.map((log, i) => (
              <div key={i} className="leading-tight whitespace-pre-wrap break-words">
                {log.startsWith('[ERROR]') || log.startsWith('[FAIL]') ? (
                  <span className="text-red-400">{log}</span>
                ) : log.startsWith('[OK]') ? (
                  <span className="text-emerald-400">{log}</span>
                ) : log.startsWith('[WARN]') ? (
                  <span className="text-amber-400">{log}</span>
                ) : log.startsWith('[EXEC]') || log.startsWith('[START]') ? (
                  <span className="text-blue-400">{log}</span>
                ) : (
                  <span className="text-slate-300">{log}</span>
                )}
              </div>
            ))}
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
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunning ? 'Executing...' : 'Execute'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
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
