import type { Disk, Partition, PendingOperation } from '../types/partition'

/**
 * Layout helpers shared by the UI.
 *
 * The backend emits partitions in on-disk offset order with unallocated
 * regions materialized between them, so array order IS physical order.
 * These helpers rely on that: "the space after a partition" means the
 * next array entry, which is exactly the only space Windows can extend
 * the partition into.
 */

/**
 * GB of unallocated space immediately following the given partition --
 * the only space Windows `Resize-Partition` can grow it into. Free space
 * elsewhere on the disk does not count, however large it is.
 */
export function adjacentFreeAfterGB(disk: Disk, partitionId: string): number {
  const idx = disk.partitions.findIndex(p => p.id === partitionId)
  if (idx < 0) return 0
  const next = disk.partitions[idx + 1]
  return next && next.type === 'unallocated' ? next.sizeGB : 0
}

/**
 * Partitions Windows protects: the boot volume (where Windows lives) and
 * the system partition (EFI/MSR, where the bootloader lives). Their flags
 * come from the backend's IsBoot/IsSystem readings.
 */
export function isWindowsProtected(partition: Partition): boolean {
  const flags = partition.flags || []
  return flags.includes('Boot') || flags.includes('System')
}

/** A disk that hosts the Windows boot or system partition. */
export function isSystemDisk(disk: Disk): boolean {
  return disk.partitions.some(isWindowsProtected)
}

/** Operation kinds that must never target a protected partition. */
export const PROTECTED_BLOCKED_OPS: ReadonlySet<PendingOperation['type']> = new Set([
  'format',
  'delete',
  'wipe',
  'change_letter',
])

/**
 * Returns a human-readable reason when staging `opType` on `partition`
 * must be refused because Windows protects that partition, else null.
 * Resize and chkdsk stay allowed on the boot volume: Windows supports
 * both, and chkdsk here is read-only.
 */
export function protectedOpBlockReason(
  opType: PendingOperation['type'],
  partition: Partition | undefined,
): string | null {
  if (!partition || !PROTECTED_BLOCKED_OPS.has(opType) || !isWindowsProtected(partition)) {
    return null
  }
  const label = partition.letter || partition.name
  return `${label} is the Windows ${partition.flags?.includes('Boot') ? 'boot' : 'system'} partition. Windows protects it, so this operation is disabled here instead of failing when applied.`
}
