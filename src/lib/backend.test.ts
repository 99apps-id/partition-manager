import { describe, expect, it, vi } from 'vitest'
import type { Disk, Partition, PendingOperation } from '../types/partition'

// toBackendOp never calls invoke, but the module imports the Tauri API;
// mock it so the tests run in plain Node without a Tauri runtime.
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { isDesktopApp, toBackendOp } from './backend'

function makePartition(overrides: Partial<Partition> = {}): Partition {
  return {
    id: 'part-1',
    number: 3,
    name: 'Windows',
    letter: 'C:',
    type: 'primary',
    sizeGB: 300,
    usedGB: 180,
    filesystem: 'NTFS',
    status: 'healthy',
    ...overrides,
  }
}

function makeDisk(overrides: Partial<Disk> = {}): Disk {
  return {
    id: 'disk-0',
    number: 0,
    name: 'Disk 0',
    model: 'NVMe Samsung SSD 990',
    serialNumber: 'S123',
    sizeGB: 512,
    interface: 'NVMe',
    partitionStyle: 'GPT',
    diskType: 'Basic',
    isSSD: true,
    temperatureC: 41,
    healthPercent: 95,
    powerOnHours: 1200,
    powerCycleCount: 300,
    totalBytesWrittenTB: 12.5,
    partitions: [makePartition()],
    smartAttributes: [],
    ...overrides,
  }
}

function makeOp(overrides: Partial<PendingOperation> = {}): PendingOperation {
  return {
    id: 'op-1',
    type: 'format',
    title: 'Format C:',
    description: '',
    diskId: 'disk-0',
    partitionId: 'part-1',
    createdAt: 0,
    ...overrides,
  }
}

describe('toBackendOp', () => {
  it('resolves disk and partition numbers and strips the letter colon', () => {
    const result = toBackendOp(makeOp(), [makeDisk()])
    expect(result).toEqual({
      id: 'op-1',
      kind: 'format',
      diskNumber: 0,
      partitionNumber: 3,
      driveLetter: 'C',
      params: {},
    })
  })

  it('forwards params verbatim', () => {
    const params = { sizeGB: 100, newLetter: 'F' }
    const result = toBackendOp(makeOp({ type: 'resize_move', params }), [makeDisk()])
    expect(result?.params).toBe(params)
  })

  it('maps disk-level operations (no partition) to null partition and empty letter', () => {
    const result = toBackendOp(makeOp({ type: 'convert_gpt', partitionId: undefined }), [makeDisk()])
    expect(result?.partitionNumber).toBeNull()
    expect(result?.driveLetter).toBe('')
    expect(result?.diskNumber).toBe(0)
  })

  it('treats an unallocated region (partition number 0) as no partition number', () => {
    const disk = makeDisk({
      partitions: [makePartition({ id: 'free-1', number: 0, letter: undefined, type: 'unallocated' })],
    })
    const result = toBackendOp(makeOp({ type: 'create', partitionId: 'free-1' }), [disk])
    expect(result?.partitionNumber).toBeNull()
    expect(result?.driveLetter).toBe('')
  })

  it('returns null when the disk no longer exists', () => {
    expect(toBackendOp(makeOp({ diskId: 'disk-9' }), [makeDisk()])).toBeNull()
  })

  it('returns null when the disk has no Windows disk number', () => {
    expect(toBackendOp(makeOp(), [makeDisk({ number: undefined })])).toBeNull()
  })

  it('falls back to null partition fields when the partition id is stale', () => {
    const result = toBackendOp(makeOp({ partitionId: 'gone' }), [makeDisk()])
    expect(result).not.toBeNull()
    expect(result?.partitionNumber).toBeNull()
    expect(result?.driveLetter).toBe('')
  })

  it('handles a partition without a drive letter', () => {
    const disk = makeDisk({ partitions: [makePartition({ letter: undefined })] })
    const result = toBackendOp(makeOp({ type: 'delete' }), [disk])
    expect(result?.partitionNumber).toBe(3)
    expect(result?.driveLetter).toBe('')
  })
})

describe('isDesktopApp', () => {
  it('is false outside a Tauri webview (plain Node test environment)', () => {
    expect(isDesktopApp()).toBe(false)
  })
})
