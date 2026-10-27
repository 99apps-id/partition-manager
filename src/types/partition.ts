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
    | 'change_letter'
    | 'set_active'
    | 'convert_gpt'
    | 'convert_mbr'
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

export type ActiveTab = 'manager' | 'smart-health'

export interface PendingConfirm {
  type: 'set_active' | 'convert_style' | 'chkdsk'
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
    | 'change_letter'
    | 'set_active'
    | 'chkdsk'
    | 'convert_gpt'
    | 'apply_progress'
  disk?: Disk
  partition?: Partition
  unallocatedIndex?: number
}
