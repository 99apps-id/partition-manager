import React, { useState } from 'react'
import { Tag, X } from 'lucide-react'
import { Disk, Partition } from '../../types/partition'
import { useDismissModal } from './useDismissModal'

interface ChangeLetterModalProps {
  partition: Partition
  existingDisks: Disk[]
  onClose: () => void
  onConfirm: (newLetter: string) => void
}

export const ChangeLetterModal: React.FC<ChangeLetterModalProps> = ({
  partition,
  existingDisks,
  onClose,
  onConfirm,
}) => {
  const currentLetter = partition.letter?.replace(':', '') || ''

  const usedLetters = new Set<string>()
  existingDisks.forEach(d => {
    d.partitions.forEach(p => {
      if (p.letter && p.id !== partition.id) {
        usedLetters.add(p.letter.replace(':', '').toUpperCase())
      }
    })
  })

  const alphabet = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const availableLetters = alphabet.filter(l => !usedLetters.has(l) && l !== 'C')

  const [selectedLetter, setSelectedLetter] = useState(currentLetter || availableLetters[0] || 'H')
  useDismissModal(onClose)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(selectedLetter ? `${selectedLetter}:` : '')
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Change Drive Letter</h3>
              <p className="text-xs text-slate-500">{partition.name}</p>
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
          <div className="text-xs text-slate-600">
            Current letter: <span className="font-mono font-bold text-blue-700">{partition.letter || 'None'}</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Select New Drive Letter
            </label>
            <select
              value={selectedLetter}
              onChange={(e) => setSelectedLetter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
            >
              {availableLetters.map(letter => (
                <option key={letter} value={letter}>
                  Drive {letter}:
                </option>
              ))}
              <option value="">None (Remove drive letter)</option>
            </select>
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
