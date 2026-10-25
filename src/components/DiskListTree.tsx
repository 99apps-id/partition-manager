import React from 'react'
import {
  HardDrive,
  ChevronDown,
  ChevronRight,
  Usb,
  Cpu,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { Disk, Partition } from '../types/partition'

interface DiskListTreeProps {
  disks: Disk[]
  selectedDisk?: Disk
  selectedPartition: Partition | null
  onSelectDisk: (disk: Disk) => void
  onSelectPartition: (disk: Disk, partition: Partition) => void
  onToggleExpand: (diskId: string) => void
  onContextMenu: (e: React.MouseEvent, type: 'disk' | 'partition' | 'unallocated', target?: any) => void
}

const TYPE_COLORS: Record<string, string> = {
  primary: '#1d6ce0',
  extended: '#7c3aed',
  logical: '#0e7490',
  system: '#0e9f6e',
  recovery: '#e08a00',
  unallocated: '#94a3b8',
}

const INTERFACE_ICONS: Record<string, React.ReactNode> = {
  NVMe: <Cpu className="w-4 h-4" />,
  SATA: <HardDrive className="w-4 h-4" />,
  USB: <Usb className="w-4 h-4" />,
  SCSI: <Layers className="w-4 h-4" />,
}

export const DiskListTree: React.FC<DiskListTreeProps> = ({
  disks,
  selectedDisk,
  selectedPartition,
  onSelectDisk,
  onSelectPartition,
  onToggleExpand,
  onContextMenu,
}) => {
  const totalPartitions = disks.reduce(
    (sum, d) => sum + d.partitions.filter(p => p.type !== 'unallocated').length,
    0
  )

  return (
    <div className="h-full flex flex-col bg-white select-none text-slate-800">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-baseline justify-between shrink-0">
        <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">Drives</h2>
        <span className="text-[11px] text-slate-400 font-medium">
          {disks.length} drives · {totalPartitions} volumes
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {disks.map(disk => {
          const isSelected = selectedDisk?.id === disk.id
          const usedGB = disk.partitions.reduce((s, p) => s + p.usedGB, 0)
          const totalGB = disk.sizeGB
          const usedPercent = totalGB > 0 ? Math.min(100, (usedGB / totalGB) * 100) : 0

          return (
            <div
              key={disk.id}
              className={`rounded-lg border transition-colors ${
                isSelected
                  ? 'border-blue-600/60 bg-blue-50/40'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                onClick={() => {
                  onSelectDisk(disk)
                  onToggleExpand(disk.id)
                }}
                onContextMenu={(e) => onContextMenu(e, 'disk', disk)}
                className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer"
              >
                <span className="text-slate-400">
                  {disk.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
                <span className="text-blue-700">
                  {INTERFACE_ICONS[disk.interface] || <HardDrive className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-slate-900">{disk.name}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-px rounded">
                      {disk.interface}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-px">{disk.model}</div>
                  <div className="mt-1.5 h-1 rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${usedPercent > 90 ? 'bg-rose-500' : usedPercent > 75 ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold text-slate-900 font-mono">{totalGB.toLocaleString('en-US')} GB</div>
                  <div className="text-[10px] text-slate-500 font-mono">{usedPercent.toFixed(0)}% used</div>
                </div>
              </div>

              {disk.expanded && (
                <div className="mx-2 mb-2 ml-9 space-y-0.5">
                  {disk.partitions.map(part => {
                    const active = selectedPartition?.id === part.id
                    return (
                      <div
                        key={part.id}
                        onClick={() => onSelectPartition(disk, part)}
                        onContextMenu={(e) => onContextMenu(e, part.type === 'unallocated' ? 'unallocated' : 'partition', part)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                          active
                            ? 'bg-white border border-blue-600/40 shadow-sm'
                            : 'border border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                          style={{ backgroundColor: TYPE_COLORS[part.type] || '#94a3b8' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {part.letter && (
                              <span className="text-[11px] font-bold font-mono text-slate-800 shrink-0">
                                {part.letter}
                              </span>
                            )}
                            <span className="text-[12px] font-medium text-slate-700 truncate">{part.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {part.filesystem} · {part.sizeGB} GB
                            {part.status === 'warning' && (
                              <span className="text-amber-600 font-semibold"> · Warning</span>
                            )}
                          </div>
                        </div>
                        {part.status === 'healthy' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-4 py-2.5 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
        <span>
          Total <span className="font-bold font-mono text-slate-700">{disks.reduce((s, d) => s + d.sizeGB, 0).toLocaleString('en-US')} GB</span>
        </span>
        <span>Right-click a drive for actions</span>
      </div>
    </div>
  )
}
