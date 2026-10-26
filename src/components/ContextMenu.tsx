import React, { useEffect, useRef } from 'react'
import {
  Sliders,
  HardDrive,
  Trash2,
  Eraser,
  Tag,
  CheckCircle,
  ShieldAlert,
  Plus,
  Lock,
} from 'lucide-react'
import type { Partition, PendingOperation } from '../types/partition'
import { isWindowsProtected, protectedOpBlockReason } from '../lib/layout'

export interface ContextMenuState {
  x: number
  y: number
  type: 'disk' | 'partition' | 'unallocated' | 'background'
  target?: any
}

interface ContextMenuProps {
  state: ContextMenuState
  onClose: () => void
  onAction: (actionType: string, target?: any) => void
  footerHeight?: number
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  state,
  onClose,
  onAction,
  footerHeight = 24,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  const menuWidth = 210
  const menuHeight = 330
  const gap = 2
  const clampedX = Math.min(state.x, window.innerWidth - menuWidth - gap)
  const clampedY = Math.max(2, Math.min(state.y, window.innerHeight - menuHeight - footerHeight - gap))

  // Ensure menu never exceeds viewport
  const menuStyle: React.CSSProperties = { left: clampedX, top: clampedY }
  const availableHeight = window.innerHeight - clampedY - footerHeight - gap
  if (availableHeight < menuHeight) {
    menuStyle.maxHeight = `${availableHeight}px`
    menuStyle.overflowY = 'auto'
  }

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [onClose])

  const renderItems = () => {
    if (state.type === 'unallocated') {
      return (
        <>
          <button
            onClick={() => onAction('create', state.target)}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Create Partition...</span>
          </button>
        </>
      )
    }

    if (state.type === 'disk') {
      return (
        <>
          <button
            onClick={() => onAction('convert_gpt', state.target)}
            className="w-full text-left px-3 py-[5px] text-xs font-medium flex items-center gap-2.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span>Convert to {state.target?.partitionStyle === 'GPT' ? 'MBR' : 'GPT'} Disk</span>
          </button>
        </>
      )
    }

    // Partition context items. Format, delete, wipe and drive-letter change
    // are disabled on the Windows boot/system partition: Windows protects
    // it, so offering them would only produce a failure at Apply time.
    const part = state.target as Partition | undefined
    const blockedReason = (op: PendingOperation['type']) => protectedOpBlockReason(op, part)
    const blockedCls = 'opacity-40 cursor-not-allowed'
    return (
      <>
        <button
          onClick={() => onAction('resize_move', state.target)}
          className="w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Resize...</span>
        </button>
        <button
          disabled={!!blockedReason('format')}
          title={blockedReason('format') || undefined}
          onClick={() => onAction('format', state.target)}
          className={`w-full text-left px-3 py-[5px] text-xs font-medium flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 transition-colors ${blockedReason('format') ? blockedCls : ''}`}
        >
          <HardDrive className="w-4 h-4 text-slate-500" />
          <span>Format...</span>
        </button>
        <button
          disabled={!!blockedReason('change_letter')}
          title={blockedReason('change_letter') || undefined}
          onClick={() => onAction('change_letter', state.target)}
          className={`w-full text-left px-3 py-[5px] text-xs font-medium flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 transition-colors ${blockedReason('change_letter') ? blockedCls : ''}`}
        >
          <Tag className="w-4 h-4 text-slate-500" />
          <span>Change Drive Letter...</span>
        </button>
        <button
          onClick={() => onAction('set_active', state.target)}
          className="w-full text-left px-3 py-[5px] text-xs font-medium flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <CheckCircle className="w-4 h-4 text-slate-500" />
          <span>Set Active</span>
        </button>
        <div className="my-1 border-t border-slate-100" />
        <button
          onClick={() => onAction('chkdsk', state.target)}
          className="w-full text-left px-3 py-[5px] text-xs font-medium flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ShieldAlert className="w-4 h-4 text-sky-600" />
          <span>Check File System...</span>
        </button>
        <button
          disabled={!!blockedReason('wipe')}
          title={blockedReason('wipe') || undefined}
          onClick={() => onAction('wipe', state.target)}
          className={`w-full text-left px-3 py-[5px] text-xs font-medium flex items-center gap-2.5 text-amber-700 hover:bg-amber-50 transition-colors ${blockedReason('wipe') ? blockedCls : ''}`}
        >
          <Eraser className="w-4 h-4 text-amber-600" />
          <span>Wipe Partition Data...</span>
        </button>
        <button
          disabled={!!blockedReason('delete')}
          title={blockedReason('delete') || undefined}
          onClick={() => onAction('delete', state.target)}
          className={`w-full text-left px-3 py-[5px] text-xs font-medium flex items-center gap-2.5 text-rose-700 hover:bg-rose-50 transition-colors ${blockedReason('delete') ? blockedCls : ''}`}
        >
          <Trash2 className="w-4 h-4 text-rose-600" />
          <span>Delete Partition</span>
        </button>
        {part && isWindowsProtected(part) && (
          <>
            <div className="my-1 border-t border-slate-100" />
            <div className="px-3 py-1.5 text-[10px] leading-snug text-slate-400 flex items-start gap-1.5 max-w-[210px]">
              <Lock className="w-3 h-3 shrink-0 mt-px" />
              <span>Windows boot/system partition: format, delete, wipe and letter change are disabled.</span>
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="fixed z-50 rounded-lg shadow-xl border border-slate-200 py-1.5 min-w-[200px] bg-white text-slate-800"
    >
      {renderItems()}
    </div>
  )
}
