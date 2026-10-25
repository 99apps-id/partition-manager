import React, { useState } from 'react'
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MoreVertical,
  Sliders,
  HardDrive,
  Trash2,
  Check,
} from 'lucide-react'
import { Disk, Partition } from '../types/partition'

interface PartitionTableProps {
  selectedDisk: Disk
  selectedPartition: Partition | null
  onSelectPartition: (partition: Partition) => void
  onContextMenu: (e: React.MouseEvent, type: 'disk' | 'partition' | 'unallocated', target?: any) => void
  onOpenModal: (type: any, partition: Partition) => void
}

const TYPE_COLORS: Record<string, string> = {
  primary: '#2563eb',
  extended: '#7c3aed',
  logical: '#0891b2',
  system: '#059669',
  recovery: '#d97706',
  unallocated: '#94a3b8',
}

export const PartitionTable: React.FC<PartitionTableProps> = ({
  selectedDisk,
  selectedPartition,
  onSelectPartition,
  onContextMenu,
  onOpenModal,
}) => {
  const [filterText, setFilterText] = useState('')

  const filteredPartitions = selectedDisk.partitions.filter(p => {
    if (!filterText) return true
    const term = filterText.toLowerCase()
    return (
      p.name.toLowerCase().includes(term) ||
      (p.letter && p.letter.toLowerCase().includes(term)) ||
      p.filesystem.toLowerCase().includes(term) ||
      p.type.toLowerCase().includes(term)
    )
  })

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
      {/* Table Header Controls */}
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-bold text-slate-800 tracking-tight">Volumes on {selectedDisk.name}</h3>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">{selectedDisk.model}</span>
        </div>

        {/* Filter Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter volumes..."
              className="pl-8 pr-3 py-1 rounded-md text-xs border border-slate-300 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 w-44"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredPartitions.length} / {selectedDisk.partitions.length}
          </span>
        </div>
      </div>

      {/* Spacious Clean Data Table with Guaranteed Column Spacing */}
      <div className="overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs whitespace-nowrap min-w-[920px] border-collapse">
          <thead className="border-b border-slate-200/90 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3 min-w-[170px]">Volume Name</th>
              <th className="px-3 py-3 min-w-[70px]">Letter</th>
              <th className="px-3 py-3 min-w-[95px]">Type</th>
              <th className="px-3 py-3 min-w-[95px]">File System</th>
              <th className="px-4 py-3 text-right min-w-[95px]">Capacity</th>
              <th className="px-4 py-3 text-right min-w-[100px]">Used Space</th>
              <th className="px-4 py-3 min-w-[150px]">Usage Bar</th>
              <th className="px-3 py-3 text-center min-w-[95px]">4K Aligned</th>
              <th className="px-3 py-3 text-center min-w-[95px]">Status</th>
              <th className="px-4 py-3 text-right min-w-[150px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredPartitions.map(part => {
              const isSelected = selectedPartition?.id === part.id
              const isUnallocated = part.type === 'unallocated'
              const partColor = TYPE_COLORS[part.type] || '#94a3b8'
              const cleanLetter = part.letter ? part.letter.replace(':', '') : ''
              const usedPercent = part.sizeGB > 0 ? (part.usedGB / part.sizeGB) * 100 : 0

              return (
                <tr
                  key={part.id}
                  onClick={() => onSelectPartition(part)}
                  onContextMenu={(e) => onContextMenu(e, isUnallocated ? 'unallocated' : 'partition', part)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/90 text-blue-950 font-medium'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Name */}
                  <td className="px-4 py-3.5 whitespace-nowrap min-w-[170px]">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: partColor }}
                      />
                      <span className="font-semibold text-slate-900">{part.name}</span>
                    </div>
                  </td>

                  {/* Letter */}
                  <td className="px-3 py-3.5 whitespace-nowrap min-w-[70px] font-mono font-bold text-slate-800">
                    {cleanLetter ? (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-700 border border-blue-200">
                        {cleanLetter}:
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </td>

                  {/* Type */}
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono bg-slate-100 text-slate-600 border border-slate-200">
                      {part.type}
                    </span>
                  </td>

                  {/* File System */}
                  <td className="px-3 py-3.5 whitespace-nowrap font-mono font-medium text-slate-700">
                    {part.filesystem}
                  </td>

                  {/* Size */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                    {part.sizeGB > 0 ? `${part.sizeGB} GB` : '-'}
                  </td>

                  {/* Used */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono text-slate-600">
                    {part.usedGB > 0 ? `${part.usedGB.toFixed(1)} GB` : '-'}
                  </td>

                  {/* Usage Bar */}
                  <td className="px-4 py-3.5 whitespace-nowrap min-w-[140px]">
                    {!isUnallocated && part.sizeGB > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${usedPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {usedPercent.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Free space</span>
                    )}
                  </td>

                  {/* 4K Alignment */}
                  <td className="px-3 py-3.5 text-center whitespace-nowrap">
                    {isUnallocated ? (
                      <span className="text-slate-400 font-mono">-</span>
                    ) : part.is4kAligned !== false ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                        <Check className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200">
                        No
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3.5 text-center whitespace-nowrap">
                    {part.status === 'healthy' ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                      </span>
                    ) : part.status === 'warning' ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" /> Warning
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-700">
                        <XCircle className="w-3.5 h-3.5" /> Error
                      </span>
                    )}
                  </td>

                  {/* Proportional Action Buttons */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {!isUnallocated ? (
                        <>
                          <button
                            onClick={() => onOpenModal('resize_move', part)}
                            title="Resize / Move Volume"
                            className="h-7 px-2.5 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Resize</span>
                          </button>
                          <button
                            onClick={() => onOpenModal('format', part)}
                            title="Format Volume"
                            className="h-7 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <HardDrive className="w-3 h-3 text-slate-500" />
                          </button>
                          <button
                            onClick={() => onOpenModal('delete', part)}
                            title="Delete Volume"
                            className="h-7 px-2 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onOpenModal('create', part)}
                          className="h-7 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                        >
                          + Create
                        </button>
                      )}
                      <button
                        onClick={(e) => onContextMenu(e, isUnallocated ? 'unallocated' : 'partition', part)}
                        className="h-7 w-7 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
