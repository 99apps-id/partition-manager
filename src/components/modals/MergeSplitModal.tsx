import React, { useState } from 'react'
import { FolderSync, Scissors, X } from 'lucide-react'
import { Disk, Partition } from '../../types/partition'
import { useDismissModal } from './useDismissModal'

interface MergeSplitModalProps {
  mode: 'merge' | 'split'
  disk: Disk
  partition: Partition
  onClose: () => void
  onConfirm: (params: any) => void
}

export const MergeSplitModal: React.FC<MergeSplitModalProps> = ({
  mode,
  disk,
  partition,
  onClose,
  onConfirm,
}) => {
  const candidatePartitions = disk.partitions.filter(p => p.id !== partition.id && p.type !== 'unallocated')
  const [targetPartitionId, setTargetPartitionId] = useState(candidatePartitions[0]?.id || '')

  const minSplit = 10
  const maxSplit = Math.max(minSplit, partition.sizeGB - partition.usedGB - 5)
  const [splitSizeGB, setSplitSizeGB] = useState(Math.floor(maxSplit / 2))
  const [newLabel, setNewLabel] = useState('New Volume')
  useDismissModal(onClose)

  const targetPart = disk.partitions.find(p => p.id === targetPartitionId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'merge') {
      onConfirm({
        sourcePartition: partition,
        targetPartition: targetPart,
        mergedSizeGB: partition.sizeGB + (targetPart?.sizeGB || 0),
      })
    } else {
      onConfirm({
        sourcePartition: partition,
        newVolumeSizeGB: splitSizeGB,
        remainingSizeGB: partition.sizeGB - splitSizeGB,
        newLabel,
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'merge' ? (
              <FolderSync className="w-4 h-4 text-blue-600" />
            ) : (
              <Scissors className="w-4 h-4 text-blue-600" />
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === 'merge' ? 'Merge Partitions' : 'Split Partition'}
              </h3>
              <p className="text-xs text-slate-500">
                {partition.letter || ''} {partition.name} ({partition.sizeGB} GB)
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
          {mode === 'merge' ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">
                  Select Adjacent Partition to Merge Into:
                </label>
                <div className="space-y-1.5">
                  {candidatePartitions.map(p => (
                    <label
                      key={p.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                        targetPartitionId === p.id
                          ? 'border-blue-500 bg-blue-50/50 text-blue-950 font-medium'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="mergeTarget"
                          checked={targetPartitionId === p.id}
                          onChange={() => setTargetPartitionId(p.id)}
                          className="accent-blue-600"
                        />
                        <div>
                          <span className="font-bold block">{p.letter ? `${p.letter} ` : ''}{p.name}</span>
                          <span className="text-[10px] text-slate-500">{p.filesystem} • {p.sizeGB} GB</span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-blue-700">+{p.sizeGB} GB</span>
                    </label>
                  ))}
                </div>
              </div>

              {targetPart && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total Merged Capacity:</span>
                    <span className="font-bold font-mono text-emerald-700 text-sm">
                      {partition.sizeGB + targetPart.sizeGB} GB
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    New Partition Name
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Original: {(partition.sizeGB - splitSizeGB).toFixed(0)} GB</span>
                    <span className="font-bold text-blue-700">New: {splitSizeGB} GB</span>
                  </div>
                  <input
                    type="range"
                    min={minSplit}
                    max={maxSplit}
                    step={5}
                    value={splitSizeGB}
                    onChange={(e) => setSplitSizeGB(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-md appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
