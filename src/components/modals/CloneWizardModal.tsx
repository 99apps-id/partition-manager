import React, { useState } from 'react'
import { Copy, X, ArrowRight, ArrowLeft } from 'lucide-react'
import { Disk } from '../../types/partition'
import { useDismissModal } from './useDismissModal'

interface CloneWizardModalProps {
  disks: Disk[]
  initialDisk?: Disk
  onClose: () => void
  onConfirm: (params: {
    cloneType: 'disk' | 'partition'
    sourceDiskId: string
    targetDiskId: string
    sectorBySector: boolean
    optimizeForSSD: boolean
  }) => void
}

export const CloneWizardModal: React.FC<CloneWizardModalProps> = ({
  disks,
  initialDisk,
  onClose,
  onConfirm,
}) => {
  const [step, setStep] = useState(1)
  const [cloneType, setCloneType] = useState<'disk' | 'partition'>('disk')
  const [sourceDiskId, setSourceDiskId] = useState(initialDisk?.id || disks[0]?.id || '')
  const [targetDiskId, setTargetDiskId] = useState(
    disks.find(d => d.id !== (initialDisk?.id || disks[0]?.id))?.id || ''
  )
  const [sectorBySector, setSectorBySector] = useState(false)
  const [optimizeForSSD, setOptimizeForSSD] = useState(true)
  useDismissModal(onClose)

  const sourceDisk = disks.find(d => d.id === sourceDiskId)
  const targetDisk = disks.find(d => d.id === targetDiskId)

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      onConfirm({
        cloneType,
        sourceDiskId,
        targetDiskId,
        sectorBySector,
        optimizeForSSD,
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Disk & Partition Clone Wizard</h3>
              <p className="text-xs text-slate-500">Step {step} of 3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className={`font-semibold ${step >= 1 ? 'text-blue-700' : ''}`}>1. Select Source</span>
          <span>→</span>
          <span className={`font-semibold ${step >= 2 ? 'text-blue-700' : ''}`}>2. Select Destination</span>
          <span>→</span>
          <span className={`font-semibold ${step >= 3 ? 'text-blue-700' : ''}`}>3. Options & Finish</span>
        </div>

        <div className="p-6 min-h-[260px]">
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setCloneType('disk')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    cloneType === 'disk' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold block mb-0.5 text-slate-900">Clone Entire Disk</span>
                  <span className="text-[11px] text-slate-500">Copy all partitions and boot data</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCloneType('partition')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    cloneType === 'partition' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold block mb-0.5 text-slate-900">Clone Single Partition</span>
                  <span className="text-[11px] text-slate-500">Copy individual volume</span>
                </button>
              </div>

              <label className="text-xs font-semibold text-slate-600 block">Select Source Drive:</label>
              <div className="space-y-1.5">
                {disks.map(d => (
                  <label
                    key={d.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                      sourceDiskId === d.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="sourceDisk"
                        checked={sourceDiskId === d.id}
                        onChange={() => setSourceDiskId(d.id)}
                        className="accent-blue-600"
                      />
                      <span className="font-bold">{d.name}</span>
                      <span className="text-slate-500">({d.model})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">{d.sizeGB} GB</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-600 block">Select Destination Drive:</label>
              <div className="space-y-1.5">
                {disks
                  .filter(d => d.id !== sourceDiskId)
                  .map(d => (
                    <label
                      key={d.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                        targetDiskId === d.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="targetDisk"
                          checked={targetDiskId === d.id}
                          onChange={() => setTargetDiskId(d.id)}
                          className="accent-blue-600"
                        />
                        <span className="font-bold">{d.name}</span>
                        <span className="text-slate-500">({d.model})</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">{d.sizeGB} GB</span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Source:</span>
                  <span className="font-bold font-mono text-slate-800">{sourceDisk?.name} ({sourceDisk?.model})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-bold font-mono text-blue-700">{targetDisk?.name} ({targetDisk?.model})</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between cursor-pointer">
                  <span>Optimize for SSD (4K Sector Alignment)</span>
                  <input
                    type="checkbox"
                    checked={optimizeForSSD}
                    onChange={(e) => setOptimizeForSSD(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </label>
                <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between cursor-pointer">
                  <span>Sector-by-sector clone</span>
                  <input
                    type="checkbox"
                    checked={sectorBySector}
                    onChange={(e) => setSectorBySector(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>{step === 3 ? 'Finish' : 'Next'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
