import React, { useState } from 'react'
import { CheckCircle2, AlertTriangle, Zap } from 'lucide-react'
import { Disk } from '../../types/partition'
import { formatCount } from '../../utils/format'

interface AlignmentToolViewProps {
  disks: Disk[]
  onAlignSuccess: (diskId: string, partitionId: string) => void
}

export const AlignmentToolView: React.FC<AlignmentToolViewProps> = ({
  disks,
  onAlignSuccess,
}) => {
  const [aligningId, setAligningId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  const handleAlign = (diskId: string, partitionId: string) => {
    setAligningId(partitionId)
    setTimeout(() => {
      onAlignSuccess(diskId, partitionId)
      setAligningId(null)
      setSuccessMessage('Partition successfully aligned to 4K sector boundary.')
      setTimeout(() => setSuccessMessage(''), 4000)
    }, 1200)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5 text-slate-800">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900">SSD 4K Alignment Tool</h2>
        <p className="text-xs text-slate-500">
          Check 4K sector alignment to ensure maximum SSD read/write speeds and lifespan
        </p>
      </div>

      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Info Banner */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs text-xs text-slate-600 leading-relaxed">
        <span className="font-bold text-slate-800 block mb-1">What is 4K Alignment?</span>
        4K alignment refers to aligning partition clusters to the physical 4,096-byte page boundaries of modern SSDs and Advanced Format HDDs. An unaligned partition results in double-write penalties, reducing overall I/O speed.
      </div>

      {/* Disks List */}
      <div className="space-y-3">
        {disks.map(disk => (
          <div key={disk.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 text-xs">
              <div>
                <span className="font-bold text-slate-900">{disk.name}</span>
                <span className="text-slate-500 ml-1.5 font-mono">({disk.model})</span>
              </div>
              <span className="font-mono text-slate-500 font-medium">
                {disk.isSSD ? 'Solid State Drive' : 'Hard Disk Drive'}
              </span>
            </div>

            <div className="space-y-2">
              {disk.partitions
                .filter(p => p.type !== 'unallocated')
                .map(part => {
                  const isAligned = part.is4kAligned !== false

                  return (
                    <div
                      key={part.id}
                      className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                        isAligned ? 'border-slate-200 bg-slate-50/50' : 'border-rose-200 bg-rose-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${isAligned ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            {part.letter && (
                              <span className="font-bold font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                {part.letter}
                              </span>
                            )}
                            <span className="font-semibold text-slate-900">{part.name}</span>
                            <span className="text-slate-500 font-mono">({part.sizeGB} GB)</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Starting sector: {part.startSector ? formatCount(part.startSector) : '2,048'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isAligned ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 4K Aligned
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                              <AlertTriangle className="w-3.5 h-3.5" /> Misaligned
                            </span>
                            <button
                              onClick={() => handleAlign(disk.id, part.id)}
                              disabled={aligningId === part.id}
                              className="h-9 px-3.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>{aligningId === part.id ? 'Aligning...' : 'Align 4K'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
