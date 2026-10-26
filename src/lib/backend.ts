import { invoke } from '@tauri-apps/api/core'
import type { Disk, PendingOperation } from '../types/partition'

/**
 * Bridge to the Rust backend (src-tauri).
 *
 * Real disk data and real partition changes only exist inside the Tauri
 * desktop app on Windows. In a plain browser the app runs in an explicitly
 * labeled demo mode with sample data, so nobody mistakes it for real disks.
 */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export interface EnvironmentInfo {
  platform: string
  isElevated: boolean
}

export async function fetchEnvironment(): Promise<EnvironmentInfo> {
  return invoke<EnvironmentInfo>('get_environment')
}

export async function fetchDisks(): Promise<Disk[]> {
  return invoke<Disk[]>('list_disks')
}

export interface BackendOp {
  id: string
  kind: string
  diskNumber: number
  partitionNumber: number | null
  driveLetter: string
  params: Record<string, any>
}

export interface OpOutcome {
  id: string
  ok: boolean
  message: string
}

/**
 * Resolves a staged UI operation to the Windows disk/partition numbers the
 * backend needs. Returns null when the target cannot be resolved (for example
 * the disk disappeared after a rescan).
 */
export function toBackendOp(op: PendingOperation, disks: Disk[]): BackendOp | null {
  const disk = disks.find(d => d.id === op.diskId)
  if (!disk || disk.number === undefined) return null

  let partitionNumber: number | null = null
  let driveLetter = ''
  if (op.partitionId) {
    const part = disk.partitions.find(p => p.id === op.partitionId)
    if (part) {
      partitionNumber = part.number && part.number > 0 ? part.number : null
      driveLetter = (part.letter || '').replace(':', '')
    }
  }

  return {
    id: op.id,
    kind: op.type,
    diskNumber: disk.number,
    partitionNumber,
    driveLetter,
    params: op.params || {},
  }
}

export async function executeOperations(ops: BackendOp[]): Promise<OpOutcome[]> {
  return invoke<OpOutcome[]>('apply_operations', { ops })
}
