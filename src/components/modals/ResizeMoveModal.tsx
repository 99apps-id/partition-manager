import React, { useState } from 'react'
import { Sliders, X, Check, AlertTriangle } from 'lucide-react'
import { Disk, Partition } from '../../types/partition'
import { adjacentFreeAfterGB } from '../../lib/layout'
import { useDismissModal } from './useDismissModal'

const round2 = (n: number) => Math.round(n * 100) / 100

interface ResizeMoveModalProps {
  disk: Disk
  partition: Partition
  onClose: () => void
  onConfirm: (params: { sizeGB: number; spaceAfterGB: number }) => void
}

export const ResizeMoveModal: React.FC<ResizeMoveModalProps> = ({
  disk,
  partition,
  onClose,
  onConfirm,
}) => {
  // Windows can only extend a partition into unallocated space that
  // immediately follows it; free space elsewhere on the disk is NOT
  // growable room, so the maximum is based on the adjacent gap alone.
  const growableGB = adjacentFreeAfterGB(disk, partition.id)

  const minSize = Math.max(partition.usedGB + 5, 10)
  const maxSize = round2(partition.sizeGB + growableGB)

  const [sizeGB, setSizeGB] = useState(partition.sizeGB)
  // Free space directly after the partition once resized: the adjacent gap
  // plus whatever shrinking releases (shrinking when sizeGB < current size).
  const spaceAfterGB = round2(Math.max(0, growableGB - (sizeGB - partition.sizeGB)))
  useDismissModal(onClose)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSizeGB(parseFloat(e.target.value))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm({
      sizeGB,
      spaceAfterGB: parseFloat(spaceAfterGB.toFixed(1)),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Resize Partition</h3>
              <p className="text-xs text-slate-500">
                {partition.letter || ''} {partition.name} on {disk.name}
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
          {/* Visual Preview Bar */}
          <div>
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5">
              <span>Layout Simulation</span>
              <span className="font-mono text-blue-700 font-bold">{sizeGB} GB</span>
            </div>
            <div className="h-10 w-full rounded-md bg-slate-100 border border-slate-300 p-0.5 flex gap-1 items-center">
              <div
                style={{ width: `${(sizeGB / maxSize) * 100}%` }}
                className="h-full bg-blue-600 rounded-xs flex items-center justify-between px-3 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <span>{partition.letter || partition.name}</span>
                <span className="font-mono text-[11px]">{sizeGB} GB</span>
              </div>
              {spaceAfterGB > 0 && (
                <div
                  style={{ width: `${(spaceAfterGB / maxSize) * 100}%` }}
                  className="h-full bg-unallocated-pattern border border-dashed border-slate-300 rounded-xs flex items-center justify-center text-[10px] text-slate-500 font-mono truncate px-1"
                >
                  Unallocated ({spaceAfterGB} GB)
                </div>
              )}
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Min: {minSize} GB (Used: {partition.usedGB} GB)</span>
              <span>Max: {maxSize} GB</span>
            </div>
            <input
              type="range"
              min={minSize}
              max={maxSize}
              step={1}
              value={sizeGB}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-200 rounded-md appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Numeric Precision Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg border border-blue-300 bg-blue-50/50">
              <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                Partition Size
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={minSize}
                  max={maxSize}
                  value={sizeGB}
                  onChange={(e) => setSizeGB(parseFloat(e.target.value) || minSize)}
                  className="w-full bg-transparent font-mono font-bold text-sm outline-none text-blue-700"
                />
                <span className="text-xs text-blue-700 font-mono">GB</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Unallocated After
              </label>
              <div className="flex items-center gap-1">
                <span className="w-full font-mono font-bold text-sm text-slate-700">
                  {spaceAfterGB.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 font-mono">GB</span>
              </div>
            </div>
          </div>

          {growableGB === 0 ? (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                This partition can only shrink right now. Windows can extend a partition only into
                unallocated space that immediately follows it, and there is none after this one --
                free space elsewhere on the disk cannot be used for growing it.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-2">
              <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                Non-destructive resize: Files on this volume will be preserved. It can grow into the{' '}
                {growableGB} GB of unallocated space directly after it. Changes will be added to the pending queue.
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
