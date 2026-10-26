import React, { useState, useEffect, useCallback } from 'react'
import { initialDisks } from './data/mockDisks'
import {
  executeOperations,
  fetchDisks,
  fetchEnvironment,
  isDesktopApp,
  toBackendOp,
} from './lib/backend'
import {
  ActiveTab,
  Disk,
  ModalState,
  Partition,
  PendingConfirm,
  PendingOperation,
} from './types/partition'
import { Toolbar } from './components/Toolbar'
import { DiskListTree } from './components/DiskListTree'
import { DiskVisualMap } from './components/DiskVisualMap'
import { PartitionTable } from './components/PartitionTable'
import { PropertiesPanel } from './components/PropertiesPanel'
import { ContextMenu, ContextMenuState } from './components/ContextMenu'
import { PendingOpsPanel } from './components/PendingOpsPanel'
import { formatCount } from './utils/format'

// Modals
import { ResizeMoveModal } from './components/modals/ResizeMoveModal'
import { CreatePartitionModal } from './components/modals/CreatePartitionModal'
import { FormatModal } from './components/modals/FormatModal'
import { DeleteWipeModal } from './components/modals/DeleteWipeModal'
import { ChangeLetterModal } from './components/modals/ChangeLetterModal'
import { ApplyOperationsModal } from './components/modals/ApplyOperationsModal'
import { ConfirmActionModal } from './components/modals/ConfirmActionModal'

// Views
import { DiskHealthSmartView } from './components/views/DiskHealthSmartView'

export default function App() {
  const [disks, setDisks] = useState<Disk[]>([])
  const [selectedDisk, setSelectedDisk] = useState<Disk | null>(null)
  // Real data state: in the desktop app disks come from the Windows Storage
  // APIs via the Rust backend. In a browser we can only show sample data,
  // which is labeled demo mode everywhere it matters.
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isElevated, setIsElevated] = useState(false)
  const [isLoadingDisks, setIsLoadingDisks] = useState(true)
  const [diskLoadError, setDiskLoadError] = useState<string | null>(null)

  const activeDisk: Disk | null = selectedDisk ?? disks[0] ?? null
  const [selectedPartition, setSelectedPartition] = useState<Partition | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('manager')

  // Panel widths with minimum constraints so layout never gets cramped
  const [leftWidth, setLeftWidth] = useState(290)
  const [rightWidth, setRightWidth] = useState(330)
  const [isResizingLeft, setIsResizingLeft] = useState(false)
  const [isResizingRight, setIsResizingRight] = useState(false)

  // Operations Queue & History
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([])
  const [undoStack, setUndoStack] = useState<PendingOperation[][]>([])
  const [redoStack, setRedoStack] = useState<PendingOperation[][]>([])

  // Modal State
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' })
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // Apply via Ctrl+Enter from anywhere
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && pendingOperations.length > 0 && !typing) {
        setModalState({ type: 'apply_progress' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingOperations.length])

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  // Sync selectedDisk reference when disks state updates
  useEffect(() => {
    if (selectedDisk) {
      const updated = disks.find(d => d.id === selectedDisk.id)
      if (updated) setSelectedDisk(updated)
    }
  }, [disks])

  // Resize Left Panel handler
  const startResizeLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingLeft(true)
    const startX = e.clientX
    const startW = leftWidth

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      setLeftWidth(Math.min(450, Math.max(220, startW + delta)))
    }
    const onUp = () => {
      setIsResizingLeft(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [leftWidth])

  // Resize Right Panel handler
  const startResizeRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingRight(true)
    const startX = e.clientX
    const startW = rightWidth

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX
      setRightWidth(Math.min(450, Math.max(240, startW + delta)))
    }
    const onUp = () => {
      setIsResizingRight(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [rightWidth])

  // Toggle Disk expand in tree
  const handleToggleExpand = (diskId: string) => {
    setDisks(disks.map(d => (d.id === diskId ? { ...d, expanded: !d.expanded } : d)))
  }

  // Handle Context Menu open
  const handleContextMenu = (e: React.MouseEvent, type: 'disk' | 'partition' | 'unallocated', target?: any) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      target,
    })
  }

  // Add Operation to Queue with Undo/Redo tracking
  const pushOperation = (op: PendingOperation) => {
    setUndoStack(prev => [...prev, pendingOperations])
    setRedoStack([])
    setPendingOperations(prev => [...prev, op])
    setModalState({ type: 'none' })
  }

  // Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setRedoStack(r => [...r, pendingOperations])
    setPendingOperations(prev)
    setUndoStack(u => u.slice(0, -1))
  }

  // Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(u => [...u, pendingOperations])
    setPendingOperations(next)
    setRedoStack(r => r.slice(0, -1))
  }

  // Discard all pending
  const handleDiscard = () => {
    if (window.confirm('Discard all pending partition operations?')) {
      setUndoStack(u => [...u, pendingOperations])
      setPendingOperations([])
    }
  }

  // Load disks from the backend (real) or sample data (browser demo)
  const loadDisks = useCallback(async () => {
    setIsLoadingDisks(true)
    setDiskLoadError(null)
    if (!isDesktopApp()) {
      setIsDemoMode(true)
      setDisks(initialDisks)
      setSelectedDisk(prev => prev ?? initialDisks[0])
      setIsLoadingDisks(false)
      return
    }
    try {
      const [realDisks, env] = await Promise.all([
        fetchDisks(),
        fetchEnvironment().catch(() => null),
      ])
      if (env) setIsElevated(env.isElevated)
      setIsDemoMode(false)
      setDisks(realDisks)
      setSelectedDisk(prev => {
        const kept = prev ? realDisks.find(d => d.id === prev.id) : undefined
        return kept ?? realDisks[0] ?? null
      })
      if (realDisks.length === 0) {
        setDiskLoadError(
          'Windows reported no physical disks. Check that drives are connected and visible in Windows Disk Management, then rescan.'
        )
      }
    } catch (err) {
      setDisks([])
      setSelectedDisk(null)
      setDiskLoadError(err instanceof Error ? err.message : String(err))
    }
    setIsLoadingDisks(false)
  }, [])

  useEffect(() => {
    void loadDisks()
  }, [loadDisks])

  // Rescan / Refresh: asks Windows for the current disk layout again
  const handleRefresh = () => {
    void loadDisks()
  }

  // Open appropriate modal
  const handleOpenModal = (type: ModalState['type'], target?: any) => {
    setContextMenu(null)
    const part = target && !('partitions' in target) ? target : selectedPartition || undefined
    const disk = target && 'partitions' in target ? target : activeDisk
    if (!disk) return

    if (type === 'set_active' && part) {
      setPendingConfirm({
        type: 'set_active',
        diskId: disk.id,
        partitionId: part.id,
        title: 'Set Partition Active',
        description: `Mark ${part.letter || part.name} as the active boot partition.`,
        detail: `This stages a "Set Active" operation for ${part.name} on ${disk.name}. The flag is applied when you press Apply.`,
      })
      return
    }

    if ((type as string) === 'convert_gpt' && disk) {
      const toStyle = disk.partitionStyle === 'GPT' ? 'MBR' : 'GPT'
      setPendingConfirm({
        type: 'convert_style',
        diskId: disk.id,
        title: `Convert Disk to ${toStyle}`,
        description: `${disk.name} uses ${disk.partitionStyle} today.`,
        detail: `This stages a partition-table conversion (${disk.partitionStyle} to ${toStyle}) for ${disk.name}. Applied on Apply.`,
      })
      return
    }

    if (type === 'chkdsk' && part) {
      setPendingConfirm({
        type: 'chkdsk',
        diskId: disk.id,
        partitionId: part.id,
        title: 'Check File System',
        description: `Schedule a consistency check for ${part.letter || part.name}.`,
        detail: `This stages a read-only file-system check for ${part.name}. Results appear after you press Apply.`,
      })
      return
    }

    setModalState({
      type,
      disk,
      partition: part,
    })
  }

  const confirmPendingAction = () => {
    if (!pendingConfirm) return
    const c = pendingConfirm
    if (c.type === 'set_active' && c.partitionId) {
      const part = disks
        .find(d => d.id === c.diskId)
        ?.partitions.find(p => p.id === c.partitionId)
      pushOperation({
        id: `op-active-${Date.now()}`,
        type: 'set_active',
        title: `Set Active: ${part?.letter || part?.name || 'Partition'}`,
        description: `Mark volume active on ${c.diskId}.`,
        diskId: c.diskId,
        partitionId: c.partitionId,
        createdAt: Date.now(),
      })
    } else if (c.type === 'convert_style') {
      const disk = disks.find(d => d.id === c.diskId)
      const toStyle = disk?.partitionStyle === 'GPT' ? 'convert_mbr' : 'convert_gpt'
      pushOperation({
        id: `op-convert-${Date.now()}`,
        type: toStyle,
        title: `Convert Disk to ${disk?.partitionStyle === 'GPT' ? 'MBR' : 'GPT'}`,
        description: `Convert ${disk?.name || c.diskId} partition table.`,
        diskId: c.diskId,
        createdAt: Date.now(),
      })
    } else {
      pushOperation({
        id: `op-${c.type}-${Date.now()}`,
        type: 'chkdsk',
        title: c.title,
        description: c.description,
        diskId: c.diskId,
        partitionId: c.partitionId,
        createdAt: Date.now(),
      })
    }
    setPendingConfirm(null)
  }

  // DEMO MODE ONLY: simulates applying operations by mutating local state.
  // In the desktop app, staged operations are executed for real by the
  // Windows backend (see executeStagedOperations below); sample data must
  // never be presented as a real disk.
  const commitAllOperationsDemo = () => {
    let updatedDisks = [...disks]

    pendingOperations.forEach(op => {
      updatedDisks = updatedDisks.map(disk => {
        if (disk.id !== op.diskId) return disk

        // 1. Resize / Move
        if (op.type === 'resize_move' && op.partitionId) {
          const newSize = op.params?.sizeGB || 100
          const oldSize = disk.partitions.find(p => p.id === op.partitionId)?.sizeGB || newSize
          const delta = newSize - oldSize
          const updatedParts = disk.partitions.map(p => {
            if (p.id === op.partitionId) {
              return { ...p, sizeGB: newSize }
            }
            if (p.type === 'unallocated') {
              return { ...p, sizeGB: Math.max(0, p.sizeGB - delta) }
            }
            return p
          })
          return { ...disk, partitions: updatedParts }
        }

        // 2. Create Partition
        if (op.type === 'create') {
          const newPart: Partition = {
            id: `p-new-${Date.now()}`,
            name: op.params?.name || 'New Volume',
            letter: op.params?.letter || '',
            type: op.params?.type || 'primary',
            sizeGB: op.params?.sizeGB || 50,
            usedGB: 0.1,
            filesystem: op.params?.filesystem || 'NTFS',
            status: 'healthy',
            clusterSizeKB: op.params?.clusterSizeKB || 4,
            is4kAligned: op.params?.is4kAligned !== false,
            isActive: false,
            volumeLabel: op.params?.name || '',
          }

          let spaceToDeduct = newPart.sizeGB
          const updatedParts: Partition[] = []

          disk.partitions.forEach(p => {
            if (p.type === 'unallocated' && spaceToDeduct > 0) {
              if (p.sizeGB > spaceToDeduct) {
                updatedParts.push(newPart)
                updatedParts.push({ ...p, sizeGB: p.sizeGB - spaceToDeduct })
                spaceToDeduct = 0
              } else {
                updatedParts.push(newPart)
                spaceToDeduct -= p.sizeGB
              }
            } else {
              updatedParts.push(p)
            }
          })

          return { ...disk, partitions: updatedParts }
        }

        // 3. Format Partition
        if (op.type === 'format' && op.partitionId) {
          const updatedParts = disk.partitions.map(p => {
            if (p.id === op.partitionId) {
              return {
                ...p,
                filesystem: op.params?.filesystem || p.filesystem,
                volumeLabel: op.params?.volumeLabel || p.volumeLabel,
                clusterSizeKB: op.params?.clusterSizeKB || p.clusterSizeKB,
                usedGB: 0.1,
              }
            }
            return p
          })
          return { ...disk, partitions: updatedParts }
        }

        // 4. Delete Partition
        if (op.type === 'delete' && op.partitionId) {
          const updatedParts = disk.partitions.map(p => {
            if (p.id === op.partitionId) {
              return {
                ...p,
                name: 'Unallocated Space',
                letter: '',
                type: 'unallocated' as const,
                filesystem: '-' as const,
                usedGB: 0,
              }
            }
            return p
          })
          return { ...disk, partitions: updatedParts }
        }

        // 5. Change Letter
        if (op.type === 'change_letter' && op.partitionId) {
          const newLetter = op.params?.newLetter || ''
          const updatedParts = disk.partitions.map(p => {
            if (p.id === op.partitionId) {
              return { ...p, letter: newLetter }
            }
            return p
          })
          return { ...disk, partitions: updatedParts }
        }

        // 6. Set Active
        if (op.type === 'set_active' && op.partitionId) {
          const updatedParts = disk.partitions.map(p => ({
            ...p,
            isActive: p.id === op.partitionId,
          }))
          return { ...disk, partitions: updatedParts }
        }

        // 7. Convert GPT / MBR
        if (op.type === 'convert_gpt' || op.type === 'convert_mbr') {
          return {
            ...disk,
            partitionStyle: op.type === 'convert_gpt' ? ('GPT' as const) : ('MBR' as const),
          }
        }

        // 8. Wipe Partition / Disk (simulated: zeroes usage, keeps structure)
        if (op.type === 'wipe') {
          if (op.partitionId) {
            const updatedParts = disk.partitions.map(p =>
              p.id === op.partitionId ? { ...p, usedGB: 0.1 } : p
            )
            return { ...disk, partitions: updatedParts }
          }
          const updatedParts = disk.partitions.map(p =>
            p.type === 'unallocated' ? p : { ...p, usedGB: 0.1 }
          )
          return { ...disk, partitions: updatedParts }
        }

        return disk
      })
    })

    setDisks(updatedDisks)
    setPendingOperations([])
    setUndoStack([])
    setRedoStack([])
  }

  // Execute staged operations. Desktop: calls the Rust backend, which runs
  // the Windows Storage cmdlets, then rescans so the UI shows the true
  // post-operation layout. Demo: local simulation, labeled as such in the log.
  const executeStagedOperations = async (ops: PendingOperation[]) => {
    if (isDemoMode) {
      commitAllOperationsDemo()
      return {
        logs: [
          '[WARN] DEMO MODE: operations were simulated against sample data only. No real disk was touched.',
          ...ops.map(op => `[OK] ${op.title} (simulated)`),
        ],
        succeededIds: ops.map(op => op.id),
        failed: false,
      }
    }
    const logs: string[] = []
    const backendOps = []
    for (const op of ops) {
      const mapped = toBackendOp(op, disks)
      if (mapped) backendOps.push(mapped)
      else logs.push(`[FAIL] ${op.title}: target disk or partition no longer exists. Rescan and stage the operation again.`)
    }
    if (backendOps.length === 0) {
      return { logs, succeededIds: [] as string[], failed: true }
    }
    try {
      const outcomes = await executeOperations(backendOps)
      const succeededIds: string[] = []
      let failed = logs.length > 0
      for (const outcome of outcomes) {
        const op = ops.find(o => o.id === outcome.id)
        const title = op?.title || outcome.id
        if (outcome.ok) {
          succeededIds.push(outcome.id)
          logs.push(`[OK] ${title}: ${outcome.message}`)
        } else {
          failed = true
          logs.push(`[FAIL] ${title}: ${outcome.message}`)
        }
      }
      // Remove only the operations that really succeeded; failed and skipped
      // ones stay in the queue so the user can retry or discard them.
      const done = new Set(succeededIds)
      setPendingOperations(prev => prev.filter(op => !done.has(op.id)))
      if (done.size > 0) {
        setUndoStack([])
        setRedoStack([])
      }
      await loadDisks()
      return { logs, succeededIds, failed }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logs.push(`[ERROR] ${message}`)
      return { logs, succeededIds: [] as string[], failed: true }
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none bg-slate-100 text-slate-800">
      {/* Window controls (minimize / maximize / close) are the native OS
          buttons provided by the window decorations. There is deliberately
          no custom title bar: on Windows the buttons must behave like every
          other Windows application. */}

      {/* ── Toolbar Header ────────────────────────────────────────── */}
      <Toolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingOperations={pendingOperations}
        undoStack={undoStack}
        redoStack={redoStack}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDiscard={handleDiscard}
        onApply={() => setModalState({ type: 'apply_progress' })}
        onRefresh={handleRefresh}
        selectedDisk={selectedDisk ?? undefined}
        selectedPartition={selectedPartition}
        onOpenModal={(type) => handleOpenModal(type)}
      />

      {/* ── Environment banners ─────────────────────────────────────── */}
      {isDemoMode && (
        <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between shrink-0">
          <span>
            <strong>Demo mode.</strong> You are viewing sample data in a browser. Disk detection and
            partition changes only work in the Windows desktop app, and operations here are simulated.
          </span>
        </div>
      )}
      {!isDemoMode && !isElevated && !isLoadingDisks && (
        <div className="px-3.5 py-2 bg-slate-800 text-slate-100 text-xs flex items-center justify-between shrink-0">
          <span>
            Running without administrator rights. You can inspect disks, but applying partition changes
            requires restarting Partition Manager as administrator.
          </span>
        </div>
      )}
      {diskLoadError && !isDemoMode && disks.length === 0 && (
        <div className="px-3.5 py-2 bg-red-50 border-b border-red-200 text-red-800 text-xs flex items-center justify-between shrink-0">
          <span>
            <strong>No disks detected.</strong> {diskLoadError}
          </span>
          <button
            onClick={() => void loadDisks()}
            className="ml-3 px-2.5 py-1 rounded bg-red-600 text-white font-semibold hover:bg-red-700 shrink-0"
          >
            Rescan
          </button>
        </div>
      )}

      {/* ── Main Workspace Content Area ────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden p-3.5 gap-3.5 bg-slate-100">
        {/* TAB 1: Partition Manager */}
        {activeTab === 'manager' && isLoadingDisks ? (
          <div className="flex-1 h-full bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col items-center justify-center gap-3 text-slate-500">
            <span className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-blue-600 animate-spin" />
            <p className="text-sm font-medium">Scanning disks...</p>
            <p className="text-xs text-slate-400">Reading the disk layout from Windows Storage.</p>
          </div>
        ) : activeTab === 'manager' && !activeDisk ? (
          <div className="flex-1 h-full bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col items-center justify-center gap-3 text-slate-500 px-8 text-center">
            <p className="text-base font-semibold text-slate-700">No disks detected</p>
            <p className="text-sm text-slate-500 max-w-md">
              {diskLoadError ||
                'No physical disks were found. Connect a drive and rescan. On Windows, disks must also be visible in Disk Management.'}
            </p>
            <button
              onClick={() => void loadDisks()}
              className="mt-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
            >
              Rescan disks
            </button>
          </div>
        ) : activeTab === 'manager' && (
          <>
            {/* Left Sidebar: Disks Tree (Card Container) */}
            <aside
              style={{ width: leftWidth }}
              className="shrink-0 h-full bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden relative"
            >
              <DiskListTree
                disks={disks}
                selectedDisk={selectedDisk ?? undefined}
                selectedPartition={selectedPartition}
                onSelectDisk={(disk) => {
                  setSelectedDisk(disk)
                  setSelectedPartition(null)
                }}
                onSelectPartition={(disk, part) => {
                  setSelectedDisk(disk)
                  setSelectedPartition(part)
                }}
                onToggleExpand={handleToggleExpand}
                onContextMenu={handleContextMenu}
              />

              {/* Resize Handle */}
              <div
                onMouseDown={startResizeLeft}
                className={`absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors z-20 ${
                  isResizingLeft ? 'bg-blue-600' : 'bg-transparent'
                }`}
              />
            </aside>

            {/* Center Area: Non-cramped, clean white visual canvas */}
            <main className="flex-1 h-full overflow-y-auto space-y-3.5 flex flex-col min-w-0 pr-0.5">
              {/* 1. Proportional Graphical Disk Map */}
              <DiskVisualMap
                disks={disks}
                selectedDisk={activeDisk!}
                selectedPartition={selectedPartition}
                onSelectDisk={setSelectedDisk}
                onSelectPartition={(disk, part) => {
                  setSelectedDisk(disk)
                  setSelectedPartition(part)
                }}
                onContextMenu={handleContextMenu}
                onOpenCreate={(disk, part) => {
                  setModalState({ type: 'create', disk, partition: part })
                }}
              />

              {/* 2. Pending Operations Queue */}
              <PendingOpsPanel
                operations={pendingOperations}
                undoCount={undoStack.length}
                redoCount={redoStack.length}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onDiscard={handleDiscard}
                onApply={() => setModalState({ type: 'apply_progress' })}
              />

              {/* 3. Partition Table */}
              <PartitionTable
                selectedDisk={activeDisk!}
                selectedPartition={selectedPartition}
                onSelectPartition={setSelectedPartition}
                onContextMenu={handleContextMenu}
                onOpenModal={(type, part) => handleOpenModal(type, part)}
              />
            </main>

            {/* Right Sidebar: Properties & Actions (Card Container) */}
            <aside
              style={{ width: rightWidth }}
              className="shrink-0 h-full bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden relative"
            >
              <PropertiesPanel
                selectedDisk={selectedDisk ?? undefined}
                selectedPartition={selectedPartition}
                onOpenModal={(type, target) => handleOpenModal(type, target)}
                onSelectPartition={setSelectedPartition}
              />

              {/* Resize Handle */}
              <div
                onMouseDown={startResizeRight}
                className={`absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors z-20 ${
                  isResizingRight ? 'bg-blue-600' : 'bg-transparent'
                }`}
              />
            </aside>
          </>
        )}

        {/* TAB 4: Health & S.M.A.R.T. */}
        {activeTab === 'smart-health' && activeDisk && (
          <div className="flex-1 h-full overflow-y-auto bg-slate-100 flex flex-col">
            <DiskHealthSmartView
              disks={disks}
              selectedDisk={activeDisk!}
              onSelectDisk={setSelectedDisk}
            />
          </div>
        )}

      </div>

      {/* ── Status Bar ────────────────────────────────────────────── */}
      {!contextMenu && (
        <footer className="h-6 px-3 border-t border-slate-200 bg-white text-[10px] text-slate-500 font-medium flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            {isLoadingDisks
              ? 'Scanning disks...'
              : isDemoMode
              ? 'Demo mode (sample data)'
              : isElevated
              ? 'Ready - Administrator'
              : 'Ready - Standard user, applying changes needs administrator rights'}
          </span>
          {pendingOperations.length > 0 ? (
            <span className="text-amber-700 font-semibold">
              {pendingOperations.length} staged — Apply to execute
            </span>
          ) : (
            <span className="text-slate-400">No staged operations</span>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span>Disks: {disks.length}</span>
          <span className="text-slate-300">|</span>
          <span>
            Total: {formatCount(disks.reduce((s, d) => s + d.sizeGB, 0))} GB
          </span>
        </div>
      </footer>
      )}

      {/* ── Context Menu ──────────────────────────────────────────── */}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onAction={(actionType, target) => {
            handleOpenModal(actionType as ModalState['type'], target)
          }}
          footerHeight={0}
        />
      )}

      {/* ── Confirm staged action ─────────────────────────────────────── */}
      {pendingConfirm && (
        <ConfirmActionModal
          confirm={pendingConfirm}
          onClose={() => setPendingConfirm(null)}
          onConfirm={confirmPendingAction}
        />
      )}

      {/* ── Modals ────────────────────────────────────────────────── */}
      {/* 1. Resize / Move Modal */}
      {modalState.type === 'resize_move' && modalState.partition && (
        <ResizeMoveModal
          disk={(modalState.disk || selectedDisk)!}
          partition={modalState.partition}
          onClose={() => setModalState({ type: 'none' })}
          onConfirm={(params) => {
            pushOperation({
              id: `op-resize-${Date.now()}`,
              type: 'resize_move',
              title: `Resize ${modalState.partition?.letter || modalState.partition?.name}`,
              description: `New size: ${params.sizeGB} GB`,
              diskId: modalState.disk?.id || selectedDisk?.id || '',
              partitionId: modalState.partition?.id,
              params,
              createdAt: Date.now(),
            })
          }}
        />
      )}

      {/* 2. Create Partition Modal */}
      {modalState.type === 'create' && (
        <CreatePartitionModal
          disk={(modalState.disk || selectedDisk)!}
          unallocatedPart={modalState.partition?.type === 'unallocated' ? modalState.partition : undefined}
          existingDisks={disks}
          onClose={() => setModalState({ type: 'none' })}
          onConfirm={(params) => {
            pushOperation({
              id: `op-create-${Date.now()}`,
              type: 'create',
              title: `Create Partition ${params.letter} (${params.name})`,
              description: `${params.filesystem} • ${params.sizeGB} GB`,
              diskId: modalState.disk?.id || selectedDisk?.id || '',
              params,
              createdAt: Date.now(),
            })
          }}
        />
      )}

      {/* 3. Format Modal */}
      {modalState.type === 'format' && modalState.partition && (
        <FormatModal
          partition={modalState.partition}
          onClose={() => setModalState({ type: 'none' })}
          onConfirm={(params) => {
            pushOperation({
              id: `op-format-${Date.now()}`,
              type: 'format',
              title: `Format ${modalState.partition?.letter || modalState.partition?.name}`,
              description: `${params.filesystem} (${params.volumeLabel})`,
              diskId: modalState.disk?.id || selectedDisk?.id || '',
              partitionId: modalState.partition?.id,
              params,
              createdAt: Date.now(),
            })
          }}
        />
      )}

      {/* 4. Delete / Wipe Modal */}
      {(modalState.type === 'delete' || modalState.type === 'wipe') && (
        <DeleteWipeModal
          mode={modalState.type}
          target={(modalState.partition || modalState.disk || selectedDisk)!}
          onClose={() => setModalState({ type: 'none' })}
          onConfirm={(params) => {
            const isTargetDisk = !modalState.partition
            const opType = modalState.type as 'delete' | 'wipe'
            pushOperation({
              id: `op-${opType}-${Date.now()}`,
              type: opType,
              title: `${opType === 'delete' ? 'Delete' : 'Wipe'} ${isTargetDisk ? 'Disk' : 'Partition'} ${modalState.partition?.letter || modalState.partition?.name || selectedDisk?.name || 'Disk'}`,
              description: opType === 'wipe' ? `Algorithm: ${params.algorithm}` : 'Release to unallocated space',
              diskId: modalState.disk?.id || selectedDisk?.id || '',
              partitionId: modalState.partition?.id,
              params,
              createdAt: Date.now(),
            })
          }}
        />
      )}

      {/* 5. Change Drive Letter Modal */}
      {modalState.type === 'change_letter' && modalState.partition && (
        <ChangeLetterModal
          partition={modalState.partition}
          existingDisks={disks}
          onClose={() => setModalState({ type: 'none' })}
          onConfirm={(newLetter) => {
            pushOperation({
              id: `op-letter-${Date.now()}`,
              type: 'change_letter',
              title: `Change Letter for ${modalState.partition?.name}`,
              description: `Assign letter: ${newLetter || 'None'}`,
              diskId: modalState.disk?.id || selectedDisk?.id || '',
              partitionId: modalState.partition?.id,
              params: { newLetter },
              createdAt: Date.now(),
            })
          }}
        />
      )}

      {/* 6. Apply Operations Progress Modal */}
      {modalState.type === 'apply_progress' && (
        <ApplyOperationsModal
          operations={pendingOperations}
          onClose={() => setModalState({ type: 'none' })}
          onExecute={executeStagedOperations}
        />
      )}
    </div>
  )
}
