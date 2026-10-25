import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, AlertOctagon, CheckCircle2, Clock, Zap } from 'lucide-react'
import { Disk } from '../../types/partition'

interface SurfaceTestViewProps {
  disks: Disk[]
  selectedDisk: Disk
  onSelectDisk: (disk: Disk) => void
}

type BlockStatus = 'pending' | 'scanning' | 'healthy' | 'damaged'

export const SurfaceTestView: React.FC<SurfaceTestViewProps> = ({
  disks,
  selectedDisk,
  onSelectDisk,
}) => {
  const TOTAL_BLOCKS = 300
  const [blocks, setBlocks] = useState<BlockStatus[]>(() =>
    Array(TOTAL_BLOCKS).fill('pending')
  )
  const [isScanning, setIsScanning] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [scanSpeedMB, setScanSpeedMB] = useState(0)
  const [badCount, setBadCount] = useState(0)
  const timerRef = useRef<any>(null)
  const scanIntervalRef = useRef<any>(null)

  const startScan = () => setIsScanning(true)
  const pauseScan = () => setIsScanning(false)
  const stopScan = () => {
    setIsScanning(false)
    setCurrentIndex(0)
    setElapsedSeconds(0)
    setBadCount(0)
    setScanSpeedMB(0)
    setBlocks(Array(TOTAL_BLOCKS).fill('pending'))
  }

  useEffect(() => {
    if (!isScanning) {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
      setScanSpeedMB(Math.floor(160 + Math.random() * 45))
    }, 1000)

    scanIntervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= TOTAL_BLOCKS - 1) {
          setIsScanning(false)
          return prev
        }

        const isBad = selectedDisk.interface === 'SATA' && (prev === 84 || prev === 192)
        if (isBad) setBadCount(b => b + 1)

        setBlocks(old => {
          const next = [...old]
          next[prev] = isBad ? 'damaged' : 'healthy'
          if (prev + 1 < TOTAL_BLOCKS) next[prev + 1] = 'scanning'
          return next
        })

        return prev + 1
      })
    }, 55)

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isScanning, selectedDisk])

  const healthyCount = blocks.filter(b => b === 'healthy').length
  const percentComplete = ((currentIndex / TOTAL_BLOCKS) * 100).toFixed(1)

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Disk Surface Test</h2>
          <p className="text-xs text-slate-500">
            Sector integrity analysis and bad sector scan
          </p>
        </div>

        {/* Drive Selector */}
        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-slate-600">Drive:</label>
          <select
            value={selectedDisk.id}
            onChange={(e) => {
              const d = disks.find(item => item.id === e.target.value)
              if (d) {
                stopScan()
                onSelectDisk(d)
              }
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Progress
          </span>
          <div className="text-xl font-bold font-mono text-blue-700">{percentComplete}%</div>
          <span className="text-[11px] text-slate-500 font-mono">{currentIndex} / {TOTAL_BLOCKS} Blocks</span>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Speed
          </span>
          <div className="text-xl font-bold font-mono text-slate-800 flex items-center gap-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>{isScanning ? scanSpeedMB : 0} MB/s</span>
          </div>
          <span className="text-[11px] text-slate-500">Transfer rate</span>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Elapsed
          </span>
          <div className="text-xl font-bold font-mono text-slate-800 flex items-center gap-1">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>
          <span className="text-[11px] text-slate-500">Scan time</span>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Healthy
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>{healthyCount}</span>
          </div>
          <span className="text-[11px] text-emerald-700">Good sectors</span>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Damaged
          </span>
          <div className="text-xl font-bold font-mono text-rose-700 flex items-center gap-1">
            <AlertOctagon className="w-4 h-4" />
            <span>{badCount}</span>
          </div>
          <span className="text-[11px] text-rose-700">Bad blocks</span>
        </div>
      </div>

      {/* Controls & Legend */}
      <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {!isScanning ? (
            <button
              onClick={startScan}
              className="px-4 py-1.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{currentIndex > 0 ? 'Resume' : 'Start'}</span>
            </button>
          ) : (
            <button
              onClick={pauseScan}
              className="px-4 py-1.5 rounded-lg font-semibold text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={stopScan}
            disabled={currentIndex === 0 && !isScanning}
            className={`px-3.5 py-1.5 rounded-lg font-semibold border flex items-center gap-1.5 ${
              currentIndex > 0 || isScanning
                ? 'border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer'
                : 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
            <span className="text-slate-600">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
            <span className="text-slate-600">Scanning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" />
            <span className="text-slate-600">Damaged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-200" />
            <span className="text-slate-500">Pending</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="grid grid-cols-15 sm:grid-cols-20 md:grid-cols-25 lg:grid-cols-30 gap-1">
          {blocks.map((status, index) => (
            <div
              key={index}
              title={`Block #${index * 16384}: ${status}`}
              className={`aspect-square rounded-xs transition-colors duration-100 ${
                status === 'healthy'
                  ? 'bg-emerald-600'
                  : status === 'scanning'
                  ? 'bg-blue-600'
                  : status === 'damaged'
                  ? 'bg-rose-600'
                  : 'bg-slate-200 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
