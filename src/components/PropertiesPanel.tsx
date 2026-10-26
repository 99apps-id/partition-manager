import React from 'react'
import {
  Sliders,
  HardDrive,
  Trash2,
  Eraser,
  Tag,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Thermometer,
} from 'lucide-react'
import { Disk, Partition } from '../types/partition'
import { formatCount } from '../utils/format'

interface PropertiesPanelProps {
  selectedDisk?: Disk
  selectedPartition: Partition | null
  onOpenModal: (type: any, target?: any) => void
  onSelectPartition: (part: Partition | null) => void
}

const TYPE_COLORS: Record<string, string> = {
  primary: '#2563eb',
  extended: '#7c3aed',
  logical: '#0891b2',
  system: '#059669',
  recovery: '#d97706',
  unallocated: '#94a3b8',
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedDisk,
  selectedPartition,
  onOpenModal,
  onSelectPartition,
}) => {
  if (!selectedDisk) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center text-xs text-slate-400 bg-white">
        Select a drive or volume to view parameters
      </div>
    )
  }

  const isUnallocated = selectedPartition?.type === 'unallocated'

  return (
    <div className="h-full flex flex-col bg-white select-none overflow-y-auto text-slate-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
        <h3 className="text-[13px] font-bold text-slate-800 tracking-tight">
          {selectedPartition ? selectedPartition.name : `${selectedDisk.name} overview`}
        </h3>
        {selectedPartition && (
          <button
            onClick={() => onSelectPartition(null)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            View Disk
          </button>
        )}
      </div>

      <div className="p-5 space-y-4 flex-1 overflow-y-auto">
        {selectedPartition ? (
          /* ── Partition Properties ─────────────────────────────────── */
          <>
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-xs shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[selectedPartition.type] || '#94a3b8' }}
                />
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {selectedPartition.name}
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedPartition.letter && (
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-100/70 text-blue-700 border border-blue-200">
                    Drive {selectedPartition.letter.replace(':', '')}:
                  </span>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase font-mono bg-white text-slate-600 border border-slate-200">
                  {selectedPartition.type}
                </span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                  {selectedPartition.filesystem}
                </span>
              </div>
            </div>

            {/* Storage Usage */}
            {!isUnallocated && selectedPartition.sizeGB > 0 && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Storage Capacity</span>
                  <span className="font-bold font-mono text-slate-800">
                    {((selectedPartition.usedGB / selectedPartition.sizeGB) * 100).toFixed(1)}% Used
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${(selectedPartition.usedGB / selectedPartition.sizeGB) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-0.5">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-500 block text-[10px]">Used Space:</span>
                    <span className="font-bold text-slate-800">{selectedPartition.usedGB.toFixed(1)} GB</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-500 block text-[10px]">Free Space:</span>
                    <span className="font-bold text-emerald-700">
                      {(selectedPartition.sizeGB - selectedPartition.usedGB).toFixed(1)} GB
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Properties Key-Value Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 text-xs overflow-hidden">
              <div className="flex justify-between items-center p-2.5">
                <span className="text-slate-500">Total Size:</span>
                <span className="font-bold font-mono text-slate-800">{selectedPartition.sizeGB} GB</span>
              </div>
              <div className="flex justify-between items-center p-2.5">
                <span className="text-slate-500">Cluster Size:</span>
                <span className="font-mono text-slate-700">{selectedPartition.clusterSizeKB || 4} KB</span>
              </div>
              <div className="flex justify-between items-center p-2.5">
                <span className="text-slate-500">Starting Sector:</span>
                <span className="font-mono text-slate-700">{selectedPartition.startSector ? formatCount(selectedPartition.startSector) : '2,048'}</span>
              </div>
              <div className="flex justify-between items-center p-2.5">
                <span className="text-slate-500">4K Sector Alignment:</span>
                <span className={`font-semibold flex items-center gap-1 ${
                  selectedPartition.is4kAligned !== false ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {selectedPartition.is4kAligned !== false ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> 4K Aligned
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Misaligned
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5">
                <span className="text-slate-500">Health Status:</span>
                <span className={`capitalize font-semibold flex items-center gap-1 ${
                  selectedPartition.status === 'healthy' ? 'text-emerald-700' : 'text-amber-600'
                }`}>
                  {selectedPartition.status}
                </span>
              </div>
            </div>

            {/* Proportional EaseUS-Style Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <h4 className="text-[11px] font-semibold text-slate-400 px-0.5">
                Actions for this volume
              </h4>

              {isUnallocated ? (
                <button
                  onClick={() => onOpenModal('create', selectedPartition)}
                  className="w-full h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-sm transition-all"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Create New Partition</span>
                </button>
              ) : (
                <>
                  {/* Primary Featured Action: Resize / Move */}
                  <button
                    onClick={() => onOpenModal('resize_move', selectedPartition)}
                    className="w-full h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Resize Partition</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onOpenModal('format', selectedPartition)}
                      className="h-10 px-3 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
                    >
                      <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Format...</span>
                    </button>
                    <button
                      onClick={() => onOpenModal('change_letter', selectedPartition)}
                      className="h-10 px-3 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
                    >
                      <Tag className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Drive Letter...</span>
                    </button>
                  </div>

                  {/* Maintenance & Dangerous Operations */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => onOpenModal('wipe', selectedPartition)}
                      className="h-10 px-3 rounded-lg border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
                    >
                      <Eraser className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Wipe Data</span>
                    </button>
                    <button
                      onClick={() => onOpenModal('delete', selectedPartition)}
                      className="h-10 px-3 rounded-lg border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Delete Volume</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          /* ── Disk Properties ──────────────────────────────────────── */
          <>
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900 truncate">{selectedDisk.name}</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium">{selectedDisk.model}</p>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 font-mono border border-slate-200">
                  {selectedDisk.interface}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 font-mono border border-slate-200">
                  {selectedDisk.partitionStyle}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 font-mono border border-slate-200">
                  {selectedDisk.diskType}
                </span>
              </div>
            </div>

            {/* Health & Temp Glance */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Health Status</span>
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{selectedDisk.healthPercent}% Good</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Temperature</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                  <Thermometer className="w-4 h-4 text-sky-600" />
                  <span>{selectedDisk.temperatureC} °C</span>
                </div>
              </div>
            </div>

            {/* Disk Hardware Parameters */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 text-xs overflow-hidden">
              <div className="flex justify-between items-center p-2.5">
                <span className="text-slate-500">Serial Number:</span>
                <span className="font-mono text-slate-700 text-[11px]">{selectedDisk.serialNumber}</span>
              </div>
              <div className="flex justify-between items-center p-2.5">
                <span className="text-slate-500">Total Capacity:</span>
                <span className="font-mono font-bold text-slate-800">{selectedDisk.sizeGB} GB</span>
              </div>
              <div className="flex justify-between items-center p-2.5">
                <span className="text-slate-500">Power-On Hours:</span>
                <span className="font-mono text-slate-700">{formatCount(selectedDisk.powerOnHours)} hrs</span>
              </div>
              <div className="flex justify-between items-center p-2.5">
                <span className="text-slate-500">Lifetime Writes:</span>
                <span className="font-mono text-slate-700">{selectedDisk.totalBytesWrittenTB} TBW</span>
              </div>
            </div>

            {/* Proportional Disk Actions */}
            <div className="space-y-2.5 pt-1">
              <h4 className="text-[11px] font-semibold text-slate-400 px-0.5">
                Actions for this drive
              </h4>

              <button
                onClick={() => onOpenModal('convert_gpt', selectedDisk)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-all"
              >
                <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  Convert to {selectedDisk.partitionStyle === 'GPT' ? 'MBR' : 'GPT'} (empty disk only)
                </span>
              </button>
              <p className="text-[11px] text-slate-400 leading-snug">
                Conversion is only offered for disks with no partitions, so existing data can never be destroyed by it.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
