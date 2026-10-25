import React, { useState } from 'react'
import { HardDrive, X, AlertTriangle } from 'lucide-react'
import { FileSystemType, Partition } from '../../types/partition'
import { useDismissModal } from './useDismissModal'

interface FormatModalProps {
  partition: Partition
  onClose: () => void
  onConfirm: (params: {
    volumeLabel: string
    filesystem: FileSystemType
    clusterSizeKB: number
    quickFormat: boolean
  }) => void
}

export const FormatModal: React.FC<FormatModalProps> = ({
  partition,
  onClose,
  onConfirm,
}) => {
  const [volumeLabel, setVolumeLabel] = useState(partition.volumeLabel || partition.name.replace(/^[A-Z]:\s*/, ''))
  const [filesystem, setFilesystem] = useState<FileSystemType>(
    partition.filesystem === '-' ? 'NTFS' : partition.filesystem
  )
  const [clusterSizeKB, setClusterSizeKB] = useState(partition.clusterSizeKB || 4)
  const [quickFormat, setQuickFormat] = useState(true)
  useDismissModal(onClose)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm({
      volumeLabel,
      filesystem,
      clusterSizeKB,
      quickFormat,
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
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Format Partition</h3>
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
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Warning: Formatting erases all data!</span>
              All files on this volume will be permanently removed.
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Partition Label
            </label>
            <input
              type="text"
              value={volumeLabel}
              onChange={(e) => setVolumeLabel(e.target.value)}
              placeholder="e.g. DATA, GAMES"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              File System
            </label>
            <select
              value={filesystem}
              onChange={(e) => setFilesystem(e.target.value as FileSystemType)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="NTFS">NTFS (Windows Default)</option>
              <option value="exFAT">exFAT (Mac/Windows)</option>
              <option value="FAT32">FAT32</option>
              <option value="EXT4">EXT4 (Linux)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Cluster Size
            </label>
            <select
              value={clusterSizeKB}
              onChange={(e) => setClusterSizeKB(parseInt(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 outline-none focus:border-blue-500"
            >
              <option value={4}>4 KB (Default)</option>
              <option value={8}>8 KB</option>
              <option value={16}>16 KB</option>
              <option value={64}>64 KB</option>
            </select>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={quickFormat}
                onChange={(e) => setQuickFormat(e.target.checked)}
                className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-700">Perform a Quick Format</span>
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
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
