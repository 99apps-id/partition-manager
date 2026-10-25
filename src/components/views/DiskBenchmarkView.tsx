import React, { useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Disk } from '../../types/partition'
import { formatCount } from '../../utils/format'

interface DiskBenchmarkViewProps {
  disks: Disk[]
  selectedDisk: Disk
  onSelectDisk: (disk: Disk) => void
}

export const DiskBenchmarkView: React.FC<DiskBenchmarkViewProps> = ({
  disks,
  selectedDisk,
  onSelectDisk,
}) => {
  const [isTesting, setIsTesting] = useState(false)
  const [currentTestName, setCurrentTestName] = useState('')
  const [progress, setProgress] = useState(0)

  const defaultScores = selectedDisk.benchmark || {
    readSeqMBs: 3500,
    writeSeqMBs: 3000,
    read4kMBs: 65,
    write4kMBs: 180,
    read4kIOPS: 450000,
    write4kIOPS: 380000,
    latencyMs: 0.05,
  }

  const [scores, setScores] = useState(defaultScores)
  const [liveSpeed, setLiveSpeed] = useState(0)

  const startBenchmark = () => {
    setIsTesting(true)
    setProgress(0)
    setLiveSpeed(0)

    const tests = [
      'Sequential Read (1MiB, Q8T1)',
      'Sequential Write (1MiB, Q8T1)',
      'Random 4K Read (Q32T1)',
      'Random 4K Write (Q32T1)',
    ]

    let step = 0
    const interval = setInterval(() => {
      step++
      setProgress(Math.min(100, step * 25))
      setCurrentTestName(tests[step - 1] || 'Finalizing...')
      setLiveSpeed(Math.floor(defaultScores.readSeqMBs * (0.85 + Math.random() * 0.25)))

      if (step >= 4) {
        clearInterval(interval)
        setIsTesting(false)
        setProgress(100)
        setCurrentTestName('Complete')
        setScores({
          ...defaultScores,
          readSeqMBs: defaultScores.readSeqMBs + Math.floor((Math.random() - 0.5) * 150),
          writeSeqMBs: defaultScores.writeSeqMBs + Math.floor((Math.random() - 0.5) * 120),
        })
      }
    }, 1100)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5 text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Disk Speed Benchmark</h2>
          <p className="text-xs text-slate-500">
            Measure sequential throughput and 4K random read/write speeds
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-slate-600">Target:</label>
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

      {/* Control Card */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div>
          <span className="font-semibold text-slate-500 block">Configuration:</span>
          <span className="font-bold text-slate-800">5 Passes • 1 GiB Block Size • {selectedDisk.interface}</span>
        </div>

        <button
          onClick={startBenchmark}
          disabled={isTesting}
          className={`px-5 py-2 rounded-lg font-semibold text-white transition-colors cursor-pointer shadow-xs ${
            isTesting ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isTesting ? 'Running...' : 'Run Benchmark'}
        </button>
      </div>

      {isTesting && (
        <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/60 space-y-1.5 text-xs">
          <div className="flex justify-between items-center font-semibold">
            <span className="text-blue-900">{currentTestName}</span>
            <span className="font-mono text-blue-700">{liveSpeed} MB/s ({progress}%)</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Read Card */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ArrowDown className="w-4 h-4 text-emerald-600" />
              <span>Read Performance</span>
            </div>
            <span className="font-mono text-emerald-700 font-semibold">MB/s</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">Sequential Read (1MiB Q8T1):</span>
              <span className="text-2xl font-bold font-mono text-emerald-700">
                {formatCount(scores.readSeqMBs)} <span className="text-xs">MB/s</span>
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">Random 4K Read (Q32T1):</span>
              <span className="text-base font-bold font-mono text-slate-800">
                {scores.read4kMBs} MB/s
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">Random 4K IOPS:</span>
              <span className="text-xs font-bold font-mono text-slate-700">
                {formatCount(scores.read4kIOPS)} IOPS
              </span>
            </div>
          </div>
        </div>

        {/* Write Card */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ArrowUp className="w-4 h-4 text-blue-600" />
              <span>Write Performance</span>
            </div>
            <span className="font-mono text-blue-700 font-semibold">MB/s</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">Sequential Write (1MiB Q8T1):</span>
              <span className="text-2xl font-bold font-mono text-blue-700">
                {formatCount(scores.writeSeqMBs)} <span className="text-xs">MB/s</span>
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">Random 4K Write (Q32T1):</span>
              <span className="text-base font-bold font-mono text-slate-800">
                {scores.write4kMBs} MB/s
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500">Random 4K IOPS:</span>
              <span className="text-xs font-bold font-mono text-slate-700">
                {formatCount(scores.write4kIOPS)} IOPS
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
