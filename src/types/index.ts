export interface User {
  id: string
  email: string
  name: string
  role: 'staff' | 'logistics' | 'admin'
}

export interface Region {
  id: string
  regionCode: string
  regionName: string
  parentRegionId?: string | null
  parentRegion?: Region | null
  subRegions?: Region[]
}

export interface Package {
  id: string
  trackingId: string
  senderName: string
  senderAddress: string
  receiverName: string
  receiverAddress: string
  weightKg: number
  originRegionId: string
  destRegionId: string
  currentRegionId: string
  currentStatus: string
  delayReason?: string | null
  createdAt: string
  updatedAt: string
  originRegion?: Region
  destRegion?: Region
  currentRegion?: Region
  statusHistory?: PackageStatusHistory[]
}

export interface PackageStatusHistory {
  id: string
  packageId: string
  status: string
  notes?: string | null
  regionId: string
  bagId?: string | null
  createdAt: string
  region?: Region
  bag?: {
    bagCode: string
  }
}

export interface Bag {
  id: string
  bagCode: string
  sealNumber?: string | null
  isSealed: boolean
  sealedAt?: string | null
  originRegionId: string
  destRegionId: string
  originRegion?: Region
  destRegion?: Region
  packages?: Package[]
  createdAt: string
}

export interface Truck {
  id: string
  truckCode: string
  capacity: number
  currentRegionId: string
  currentRegion?: Region
  createdAt: string
}

export interface TruckSchedule {
  id: string
  truckId: string
  routeDescription: string
  departureTime: string
  estimatedArrivalTime: string
  status: 'scheduled' | 'in_transit' | 'arrived' | 'cancelled'
  truck?: Truck
  bags?: Bag[]
  createdAt: string
}

export interface DashboardSummary {
  newArrivalsCount: number
  truckArrivalsCount: number
  loadedCount: number
  delayedCount: number
}
