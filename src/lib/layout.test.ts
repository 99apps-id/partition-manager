import { describe, expect, it } from 'vitest'
import type { Disk, Partition } from '../types/partition'
import {
  adjacentFreeAfterGB,
  isSystemDisk,
  isWindowsProtected,
  protectedOpBlockReason,
} from './layout'

function part(overrides: Partial<Partition> = {}): Partition {
  return {
    id: 'p1',
    name: 'Volume',
    type: 'primary',
    sizeGB: 100,
    usedGB: 40,
    filesystem: 'NTFS',
    status: 'healthy',
    ...overrides,
  }
}

function gap(id: string, sizeGB: number): Partition {
  return part({ id, name: 'Unallocated', type: 'unallocated', sizeGB, usedGB: 0, filesystem: '-' })
}

function disk(partitions: Partition[]): Disk {
  return {
    id: 'disk-0',
    number: 0,
    name: 'Disk 0',
    model: 'Test SSD',
    serialNumber: 'X',
    sizeGB: 512,
    interface: 'NVMe',
    partitionStyle: 'GPT',
    diskType: 'Basic',
    isSSD: true,
    temperatureC: 40,
    healthPercent: 99,
    powerOnHours: 10,
    powerCycleCount: 3,
    totalBytesWrittenTB: 1,
    partitions,
    smartAttributes: [],
  }
}

// Layout: [C: 100][free 50][D: 100][free 20]
const layoutDisk = disk([
  part({ id: 'c', letter: 'C:', sizeGB: 100, flags: ['Boot'] }),
  gap('g1', 50),
  part({ id: 'd', letter: 'D:', sizeGB: 100 }),
  gap('g2', 20),
])

describe('adjacentFreeAfterGB', () => {
  it('counts only the gap directly after the partition', () => {
    expect(adjacentFreeAfterGB(layoutDisk, 'c')).toBe(50)
    expect(adjacentFreeAfterGB(layoutDisk, 'd')).toBe(20)
  })

  it('is 0 when another partition follows, however much free space exists elsewhere', () => {
    const d = disk([part({ id: 'a' }), part({ id: 'b' }), gap('g', 400)])
    expect(adjacentFreeAfterGB(d, 'a')).toBe(0)
    expect(adjacentFreeAfterGB(d, 'b')).toBe(400)
  })

  it('is 0 for the last entry and for unknown partitions', () => {
    expect(adjacentFreeAfterGB(layoutDisk, 'g2')).toBe(0)
    expect(adjacentFreeAfterGB(layoutDisk, 'nope')).toBe(0)
  })
})

describe('Windows protection', () => {
  it('detects Boot and System flags, tolerates missing flags', () => {
    expect(isWindowsProtected(part({ flags: ['Boot'] }))).toBe(true)
    expect(isWindowsProtected(part({ flags: ['System', 'Hidden', 'EFI System'] }))).toBe(true)
    expect(isWindowsProtected(part({ flags: ['Active'] }))).toBe(false)
    expect(isWindowsProtected(part({}))).toBe(false)
  })

  it('marks a disk as system disk when any partition is protected', () => {
    expect(isSystemDisk(layoutDisk)).toBe(true)
    expect(isSystemDisk(disk([part({ id: 'x' })]))).toBe(false)
  })

  it('blocks destructive ops on the boot volume but allows resize and chkdsk', () => {
    const boot = part({ letter: 'C:', flags: ['Boot'] })
    for (const op of ['format', 'delete', 'wipe', 'change_letter'] as const) {
      expect(protectedOpBlockReason(op, boot)).toContain('boot partition')
    }
    expect(protectedOpBlockReason('resize_move', boot)).toBeNull()
    expect(protectedOpBlockReason('chkdsk', boot)).toBeNull()
  })

  it('does not block anything on ordinary partitions', () => {
    const data = part({ letter: 'D:' })
    for (const op of ['format', 'delete', 'wipe', 'change_letter'] as const) {
      expect(protectedOpBlockReason(op, data)).toBeNull()
    }
    expect(protectedOpBlockReason('format', undefined)).toBeNull()
  })
})
