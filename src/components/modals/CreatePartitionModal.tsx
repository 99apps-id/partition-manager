import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Disk, FileSystemType, Partition, PartitionType } from '../../types/partition'
import { useDismissModal } from './useDismissModal'

interface CreatePartitionModalProps {
  disk: Disk
  unallocatedPart?: Partition
  existingDisks: Disk[]
  onClose: () => void
  onConfirm: (params: {
    name: string
    letter: string
    filesystem: FileSystemType
    sizeGB: number
    type: PartitionType
    clusterSizeKB: number
    is4kAligned: boolean
  }) => void
}

export const CreatePartitionModal: React.FC<CreatePartitionModalProps> = ({
  disk,
  unallocatedPart,
  existingDisks,
  onClose,
  onConfirm,
}) => {
  const usedLetters = new Set<string>()
  existingDisks.forEach(d => {
    d.partitions.forEach(p => {
      if (p.letter) usedLetters.add(p.letter.replace(':', '').toUpperCase())
    })
  })

  const allLetters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const availableLetters = allLetters.filter(l => !usedLetters.has(l))
  const defaultLetter = availableLetters[0] ? `${availableLetters[0]}:` : 'H:'

  const maxAvailableGB = unallocatedPart ? unallocatedPart.sizeGB : 100

  const [name, setName] = useState('New Volume')
  const [letter, setLetter] = useState(defaultLetter)
  const [filesystem, setFilesystem] = useState<FileSystemType>('NTFS')
  const [sizeGB, setSizeGB] = useState(Math.min(maxAvailableGB, 100))
  const [type, setType] = useState<PartitionType>('primary')
  const [clusterSizeKB, setClusterSizeKB] = useState(4)
  const [is4kAligned, setIs4kAligned] = useState(true)
  useDismissModal(onClose)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm({
      name: `${letter} ${name}`,
      letter,
      filesystem,
      sizeGB,
      type,
      clusterSizeKB,
      is4kAligned,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create New Partition</h3>
              <p className="text-xs text-slate-500">Target Disk: {disk.name}</p>
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
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Volume Label
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Media, Backups"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Drive Letter
              </label>
              <select
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
              >
                {availableLetters.map(l => (
                  <option key={l} value={`${l}:`}>{l}:</option>
                ))}
                <option value="">None</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                <option value="exFAT">exFAT (Mac/Win)</option>
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
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-600">Partition Size</label>
              <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                <input
                  type="number"
                  min={1}
                  max={maxAvailableGB}
                  value={sizeGB}
                  onChange={(e) => setSizeGB(Math.min(maxAvailableGB, Math.max(1, parseFloat(e.target.value) || 1)))}
                  className="w-14 bg-transparent text-right outline-none border-b border-slate-300 text-blue-700"
                />
                <span>GB of {maxAvailableGB} GB Free</span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={maxAvailableGB}
              step={1}
              value={sizeGB}
              onChange={(e) => setSizeGB(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-md appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Partition Type
              </label>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="partType"
                    checked={type === 'primary'}
                    onChange={() => setType('primary')}
                    className="accent-blue-600"
                  />
                  <span>Primary</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="partType"
                    checked={type === 'logical'}
                    onChange={() => setType('logical')}
                    className="accent-blue-600"
                  />
                  <span>Logical</span>
                </label>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={is4kAligned}
                  onChange={(e) => setIs4kAligned(e.target.checked)}
                  className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
                />
                <span className="font-medium text-slate-700">Optimize for SSD (4K Alignment)</span>
              </label>
            </div>
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
