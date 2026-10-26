export type PartitionType = 'primary' | 'logical' | 'system' | 'recovery' | 'unallocated' | 'extended'
export type FileSystemType = 'NTFS' | 'FAT32' | 'exFAT' | 'EXT4' | 'ReFS' | '-'
export type PartitionStatus = 'healthy' | 'warning' | 'error'
export type DiskInterface = 'NVMe' | 'SATA' | 'USB' | 'SCSI'
export type PartitionStyle = 'GPT' | 'MBR'
export type DiskType = 'Basic' | 'Dynamic'

export interface Partition {
  id: string
  /** Windows partition number (MSFT_Partition.PartitionNumber). 0 for unallocated regions. */
  number?: number
  name: string
  letter?: string
  type: PartitionType
  sizeGB: number
  usedGB: number
  filesystem: FileSystemType
  status: PartitionStatus
  clusterSizeKB?: number
  is4kAligned?: boolean
  isActive?: boolean
  isHidden?: boolean
  volumeLabel?: string
  startSector?: number
  flags?: string[]
}

export interface SmartAttribute {
  id: number
  name: string
  current: number
  worst: number
  threshold: number
  rawValue: string
  status: 'OK' | 'Warning' | 'Failing'
}

export interface BenchmarkResult {
  readSeqMBs: number
  writeSeqMBs: number
  read4kMBs: number
  write4kMBs: number
  read4kIOPS: number
  write4kIOPS: number
  latencyMs: number
}

export interface Disk {
  id: string
  /** Windows disk number (MSFT_Disk.Number). */
  number?: number
  name: string
  model: string
  serialNumber: string
  sizeGB: number
  interface: DiskInterface
  partitionStyle: PartitionStyle
  diskType: DiskType
  isSSD: boolean
  temperatureC: number
  healthPercent: number
  powerOnHours: number
  powerCycleCount: number
  totalBytesWrittenTB: number
  partitions: Partition[]
  smartAttributes: SmartAttribute[]
  benchmark?: BenchmarkResult
  expanded?: boolean
}

export interface PendingOperation {
  id: string
  type:
    | 'resize_move'
    | 'create'
    | 'format'
    | 'delete'
    | 'wipe'
    | 'merge'
    | 'split'
    | 'change_letter'
    | 'set_active'
    | 'convert_gpt'
    | 'convert_mbr'
    | 'clone_disk'
    | 'clone_partition'
    | 'align_4k'
    | 'rebuild_mbr'
    | 'clone'
    | 'chkdsk'
  title: string
  description: string
  diskId: string
  partitionId?: string
  targetDiskId?: string
  targetPartitionId?: string
  params?: Record<string, any>
  createdAt: number
}

export type ActiveTab =
  | 'manager'
  | 'clone'
  | 'surface-test'
  | 'smart-health'
  | 'benchmark'
  | 'alignment'

export interface PendingConfirm {
  type: 'set_active' | 'convert_style' | 'rebuild_mbr' | 'chkdsk'
  diskId: string
  partitionId?: string
  title: string
  description: string
  detail?: string
}

export interface ModalState {
  type:
    | 'none'
    | 'resize_move'
    | 'create'
    | 'format'
    | 'delete'
    | 'wipe'
    | 'merge'
    | 'split'
    | 'change_letter'
    | 'set_active'
    | 'clone'
    | 'chkdsk'
    | 'rebuild_mbr'
    | 'convert_gpt'
    | 'apply_progress'
  disk?: Disk
  partition?: Partition
  unallocatedIndex?: number
}
