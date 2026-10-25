import React, { useState } from 'react'
import { LayoutGrid, Plus } from 'lucide-react'
import { Disk, Partition } from '../types/partition'

interface DiskVisualMapProps {
  disks: Disk[]
  selectedDisk: Disk
  selectedPartition: Partition | null
  onSelectDisk: (disk: Disk) => void
  onSelectPartition: (disk: Disk, partition: Partition) => void
  onContextMenu: (e: React.MouseEvent, type: 'disk' | 'partition' | 'unallocated', target?: any) => void
  onOpenCreate: (disk: Disk, part: Partition) => void
}

const TYPE_COLORS: Record<string, string> = {
  primary: '#1d6ce0',
  system: '#0e9f6e',
  recovery: '#e08a00',
  logical: '#0e7490',
  extended: '#7c3aed',
  unallocated: '#e2e8f0',
}

const LEGEND: { label: string; swatch: string; dashed?: boolean }[] = [
  { label: 'Primary', swatch: '#1d6ce0' },
  { label: 'System', swatch: '#0e9f6e' },
  { label: 'Recovery', swatch: '#e08a00' },
  { label: 'Unallocated', swatch: '#e2e8f0', dashed: true },
]

export const DiskVisualMap: React.FC<DiskVisualMapProps> = ({
  disks,
  selectedDisk,
  selectedPartition,
  onSelectDisk,
  onSelectPartition,
  onContextMenu,
  onOpenCreate,
}) => {
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all')

  const disksToRender = viewMode === 'all' ? disks : [selectedDisk]

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]" aria-label="Disk layout map">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-nowrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutGrid className="w-4 h-4 text-blue-700 shrink-0" />
          <h3 className="text-[13px] font-bold text-slate-800 tracking-tight whitespace-nowrap">Disk Layout</h3>
          <span className="text-[11px] text-slate-400 font-medium truncate hidden sm:inline">
            Segments are proportional to size — click to select, right-click for actions
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500 font-medium pr-3 border-r border-slate-200">
            {LEGEND.map(item => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-[3px] ${item.dashed ? 'border border-dashed border-slate-400' : ''}`}
                  style={{ backgroundColor: item.swatch }}
                />
                {item.label}
              </span>
            ))}
          </div>

          <div className="flex items-center p-0.5 rounded-lg border border-slate-200 bg-white text-xs" role="tablist" aria-label="Disk map scope">
            <button
              role="tab"
              aria-selected={viewMode === 'all'}
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                viewMode === 'all' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Disks
            </button>
            <button
              role="tab"
              aria-selected={viewMode === 'selected'}
              onClick={() => setViewMode('selected')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                viewMode === 'selected' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Current Disk
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {disksToRender.map(disk => {
          const isCurrentDisk = selectedDisk.id === disk.id
          const totalGB = disk.sizeGB

          return (
            <div
              key={disk.id}
              onClick={() => onSelectDisk(disk)}
              onContextMenu={(e) => onContextMenu(e, 'disk', disk)}
              className={`rounded-lg border transition-colors cursor-pointer overflow-hidden ${
                isCurrentDisk
                  ? 'border-blue-600 ring-1 ring-blue-600/30 bg-blue-50/[0.35]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-5 rounded-full ${isCurrentDisk ? 'bg-blue-600' : 'bg-slate-300'}`} />
                  <span className="font-bold text-slate-900 text-[13px] whitespace-nowrap">{disk.name}</span>
                  <span className="text-slate-500 text-xs truncate hidden lg:inline">{disk.model}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-mono font-semibold whitespace-nowrap">
                    {disk.diskType} · {disk.partitionStyle} · {disk.interface}
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-800 text-[13px] whitespace-nowrap">
                  {disk.sizeGB.toLocaleString('en-US')} GB
                </div>
              </div>

              {/* Continuous capacity bar: one track, seamless segments */}
              <div className="p-3">
                <div className="h-[64px] w-full rounded-md overflow-hidden border border-slate-300/80 bg-slate-100 flex">
                  {disk.partitions.map(part => {
                    const isSelected = selectedPartition?.id === part.id && isCurrentDisk
                    const isUnallocated = part.type === 'unallocated'
                    const color = TYPE_COLORS[part.type] || '#1d6ce0'
                    const rawPercent = totalGB > 0 ? (part.sizeGB / totalGB) * 100 : 0
                    const flexGrow = Math.max(rawPercent, 1.5)
                    const usedPercent = part.sizeGB > 0 ? Math.min(100, (part.usedGB / part.sizeGB) * 100) : 0
                    const cleanLetter = part.letter ? part.letter.replace(':', '') : ''

                    return (
                      <div
                        key={part.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectDisk(disk)
                          onSelectPartition(disk, part)
                        }}
                        onContextMenu={(e) => {
                          e.stopPropagation()
                          onSelectDisk(disk)
                          onContextMenu(e, isUnallocated ? 'unallocated' : 'partition', part)
                        }}
                        title={`${part.name}${part.letter ? ` (${part.letter})` : ''} — ${part.sizeGB} GB (${part.filesystem})`}
                        style={{ flexGrow, flexBasis: 0, minWidth: 0, backgroundColor: isUnallocated ? '#eef2f7' : color }}
                        className={`relative h-full cursor-pointer select-none overflow-hidden border-r border-white/70 last:border-r-0 transition-[filter] ${
                          isUnallocated ? 'bg-[repeating-linear-gradient(45deg,#e2e8f0_0_6px,#f1f5f9_6px_12px)]' : ''
                        } ${isSelected ? 'z-10 outline-2 outline-blue-800 outline-offset-[-2px]' : 'hover:brightness-[1.07]'}`}
                      >
                        <div className="absolute inset-x-0 top-0 h-[3px] bg-white/25" />
                        {isSelected && <div className="absolute inset-x-0 bottom-0 h-[3px] bg-blue-950" />}

                        <div className="relative h-full flex flex-col justify-center px-2 gap-1 min-w-0">
                          <div className={`flex items-center gap-1.5 min-w-0 ${isUnallocated ? 'justify-center' : ''}`}>
                            {cleanLetter && !isUnallocated && (
                              <span className="font-bold font-mono bg-black/35 text-white px-1.5 py-px rounded text-[11px] shrink-0 leading-5">
                                {cleanLetter}:
                              </span>
                            )}
                            {rawPercent >= 9 && (
                              <span className={`truncate text-[12px] font-semibold leading-5 ${isUnallocated ? 'text-slate-500' : 'text-white'}`}>
                                {isUnallocated ? 'Unallocated' : part.name}
                              </span>
                            )}
                            {rawPercent >= 6 && (
                              <span className={`text-[11px] font-mono font-semibold shrink-0 ml-auto ${isUnallocated ? 'text-slate-500' : 'text-white/90'}`}>
                                {part.sizeGB} GB
                              </span>
                            )}
                          </div>
                          {!isUnallocated && rawPercent >= 9 && (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1 rounded-full bg-black/30 overflow-hidden">
                                <div className="h-full bg-white/95 rounded-full" style={{ width: `${usedPercent}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-white/85 shrink-0">{part.filesystem}</span>
                            </div>
                          )}
                          {isUnallocated && rawPercent >= 14 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectDisk(disk)
                                onOpenCreate(disk, part)
                              }}
                              className="mx-auto px-2.5 py-1 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-blue-800"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Create
                            </button>
                          )}
                          {isUnallocated && rawPercent < 14 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectDisk(disk)
                                onOpenCreate(disk, part)
                              }}
                              aria-label="Create partition in unallocated space"
                              title="Create partition"
                              className="mx-auto w-5 h-5 rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-blue-800"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
