import React from 'react'
import { Thermometer, HardDrive, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Disk } from '../../types/partition'
import { formatCount } from '../../utils/format'

interface DiskHealthSmartViewProps {
  disks: Disk[]
  selectedDisk: Disk
  onSelectDisk: (disk: Disk) => void
}

export const DiskHealthSmartView: React.FC<DiskHealthSmartViewProps> = ({
  disks,
  selectedDisk,
  onSelectDisk,
}) => {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Health & S.M.A.R.T. Monitor</h2>
          <p className="text-xs text-slate-500">
            Hardware health diagnostics, thermal readings, and raw telemetry
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-slate-600">Drive:</label>
          <select
            value={selectedDisk.id}
            onChange={(e) => {
              const d = disks.find(item => item.id === e.target.value)
              if (d) onSelectDisk(d)
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium outline-none"
          >
            {disks.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.model})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Health Status
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700 font-mono">
              {selectedDisk.healthPercent}%
            </span>
            <span className="text-xs font-bold text-emerald-800">
              {selectedDisk.healthPercent > 95 ? 'Good' : 'Caution'}
            </span>
          </div>
          <div className="mt-3">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${selectedDisk.healthPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Estimated lifespan: {selectedDisk.isSSD ? '6.8 Years' : '4.2 Years'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Operating Temperature
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800 font-mono">
              {selectedDisk.temperatureC}°C
            </span>
            <span className="text-xs text-slate-500">
              ({((selectedDisk.temperatureC * 9) / 5 + 32).toFixed(0)}°F)
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <Thermometer className="w-3.5 h-3.5 text-sky-600" />
            <span>Normal range</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Power-On Time
          </span>
          <div className="text-xl font-bold font-mono text-slate-800">
            {formatCount(selectedDisk.powerOnHours)} Hours
          </div>
          <span className="text-[11px] text-slate-500 mt-3 block">
            Power cycles: {selectedDisk.powerCycleCount}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Lifetime Writes
          </span>
          <div className="text-xl font-bold font-mono text-slate-800">
            {selectedDisk.totalBytesWrittenTB} TBW
          </div>
          <span className="text-[11px] text-slate-500 mt-3 block">
            Wear level: {((selectedDisk.totalBytesWrittenTB / 600) * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* S.M.A.R.T. Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              S.M.A.R.T. Attribute Table
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Serial: {selectedDisk.serialNumber}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-2.5">ID</th>
                <th className="px-5 py-2.5">Attribute Name</th>
                <th className="px-4 py-2.5 text-right">Current</th>
                <th className="px-4 py-2.5 text-right">Worst</th>
                <th className="px-4 py-2.5 text-right">Threshold</th>
                <th className="px-5 py-2.5 font-mono">Raw Value</th>
                <th className="px-5 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {selectedDisk.smartAttributes.map(attr => (
                <tr key={attr.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-2.5 font-mono font-bold text-slate-500">
                    {attr.id.toString().padStart(2, '0')}
                  </td>
                  <td className="px-5 py-2.5 font-medium text-slate-900">
                    {attr.name}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{attr.current}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-500">{attr.worst}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-400">{attr.threshold}</td>
                  <td className="px-5 py-2.5 font-mono">{attr.rawValue}</td>
                  <td className="px-5 py-2.5 text-center">
                    {attr.status === 'OK' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" /> Warning
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
