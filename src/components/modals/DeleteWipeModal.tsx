import React, { useState } from 'react'
import { Trash2, Eraser, X, ShieldAlert } from 'lucide-react'
import { Disk, Partition } from '../../types/partition'
import { useDismissModal } from './useDismissModal'

interface DeleteWipeModalProps {
  mode: 'delete' | 'wipe'
  target: Disk | Partition
  onClose: () => void
  onConfirm: (params: { algorithm?: string; wipeType?: 'partition' | 'disk' }) => void
}

export const DeleteWipeModal: React.FC<DeleteWipeModalProps> = ({
  mode,
  target,
  onClose,
  onConfirm,
}) => {
  const isDisk = 'partitions' in target
  const [algorithm, setAlgorithm] = useState('dod_3pass')
  const [confirmed, setConfirmed] = useState(false)
  useDismissModal(onClose)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm({
      algorithm,
      wipeType: isDisk ? 'disk' : 'partition',
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
          mode === 'delete' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            {mode === 'delete' ? (
              <Trash2 className="w-4 h-4 text-rose-600" />
            ) : (
              <Eraser className="w-4 h-4 text-amber-600" />
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === 'delete' ? 'Delete Partition' : isDisk ? 'Wipe Entire Disk' : 'Wipe Partition'}
              </h3>
              <p className="text-xs text-slate-500">
                Target: {target.name} ({target.sizeGB} GB)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
            mode === 'delete' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">
                {mode === 'delete' ? 'Warning: Partition Deletion' : 'Warning: Irreversible Data Sanitization'}
              </span>
              {mode === 'delete'
                ? `Deleting this partition will mark the ${target.sizeGB} GB space as unallocated.`
                : `Wiping will overwrite sectors permanently. Data cannot be recovered.`}
            </div>
          </div>

          {mode === 'wipe' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 block">
                Select Sanitization Method
              </label>
              <div className="space-y-1.5">
                <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between cursor-pointer text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="algo"
                      checked={algorithm === 'zero_fill'}
                      onChange={() => setAlgorithm('zero_fill')}
                      className="accent-blue-600"
                    />
                    <div>
                      <span className="font-bold block">One-Pass Zero Fill</span>
                      <span className="text-[10px] text-slate-500">Fills sectors with zeros</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">1 Pass</span>
                </label>

                <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between cursor-pointer text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="algo"
                      checked={algorithm === 'dod_3pass'}
                      onChange={() => setAlgorithm('dod_3pass')}
                      className="accent-blue-600"
                    />
                    <div>
                      <span className="font-bold block">DoD 5220.22-M Standard</span>
                      <span className="text-[10px] text-slate-500">US Military 3-pass standard</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">3 Passes</span>
                </label>

                <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between cursor-pointer text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="algo"
                      checked={algorithm === 'gutmann'}
                      onChange={() => setAlgorithm('gutmann')}
                      className="accent-blue-600"
                    />
                    <div>
                      <span className="font-bold block">Gutmann Algorithm</span>
                      <span className="text-[10px] text-slate-500">Forensic maximum security</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">35 Passes</span>
                </label>
              </div>
            </div>
          )}

          <div className="pt-1">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="rounded accent-blue-600 w-4 h-4 mt-0.5 cursor-pointer"
              />
              <span className="text-slate-700">
                I understand this operation cannot be undone.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!confirmed}
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-xs cursor-pointer ${
                !confirmed
                  ? 'opacity-50 cursor-not-allowed bg-slate-400'
                  : mode === 'delete'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
