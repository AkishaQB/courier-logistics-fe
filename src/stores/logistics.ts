import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import type { Region, Package, Bag, Truck, TruckSchedule, DashboardSummary } from '@/types'

export const useLogisticsStore = defineStore('logistics', () => {
  // ─── Loading & Error States ──────────────────────────────
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ─── Active Region (for filtering) ───────────────────────
  const activeRegionId = ref<string>('')

  // ─── Dashboard Stats ─────────────────────────────────────
  const dashboardData = ref<any | null>(null)
  const newArrivals = ref<Package[]>([])
  const truckArrivals = ref<Package[]>([])
  const loadedPackages = ref<Package[]>([])
  const delayedPackages = ref<Package[]>([])

  async function fetchDashboard() {
    loading.value = true
    error.value = null
    try {
      const regionParam = activeRegionId.value ? `?regionId=${activeRegionId.value}` : ''
      const [dbRes, naRes, taRes, ldRes, dyRes] = await Promise.all([
        api.get(`/api/dashboard${regionParam}`),
        api.get(`/api/dashboard/new-arrivals${regionParam}`),
        api.get(`/api/dashboard/truck-arrivals${regionParam}`),
        api.get(`/api/dashboard/loaded${regionParam}`),
        api.get(`/api/dashboard/delayed${regionParam}`)
      ])
      dashboardData.value = dbRes.data.data
      newArrivals.value = naRes.data.data || []
      truckArrivals.value = taRes.data.data || []
      loadedPackages.value = ldRes.data.data || []
      delayedPackages.value = dyRes.data.data || []
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to load dashboard data'
    } finally {
      loading.value = false
    }
  }

  // ─── Regions (Hubs) ──────────────────────────────────────
  const regions = ref<Region[]>([])
  async function fetchRegions() {
    loading.value = true
    try {
      const { data } = await api.get<{ data: Region[] }>('/api/regions')
      console.log('data', data)
      regions.value = data.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to load regions'
    } finally {
      loading.value = false
    }
  }

  async function createRegion(payload: { regionCode: string; regionName: string; parentRegionId?: string }) {
    loading.value = true
    try {
      const { data } = await api.post('/api/regions', payload)
      await fetchRegions()
      return data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create region'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Packages ────────────────────────────────────────────
  const packages = ref<Package[]>([])
  async function fetchPackages() {
    loading.value = true
    try {
      const regionParam = activeRegionId.value ? `?regionId=${activeRegionId.value}` : ''
      const { data } = await api.get<{ data: Package[] }>(`/api/packages${regionParam}`)
      packages.value = data.data || []
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to load packages'
    } finally {
      loading.value = false
    }
  }

  async function registerPackage(payload: any) {
    loading.value = true
    try {
      const { data } = await api.post('/api/packages', payload)
      await fetchPackages()
      return data.data
    } catch (err: any) {
      error.value = err.response?.data?.error || err.response?.data?.message || 'Failed to register package'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updatePackageStatus(packageId: string, payload: { status: string; notes?: string; regionId?: string; bagId?: string }) {
    loading.value = true
    try {
      const { data } = await api.patch(`/api/packages/${packageId}/status`, payload)
      await fetchPackages()
      await fetchDashboard()
      return data.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update package status'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getPackageHistory(packageId: string) {
    try {
      const { data } = await api.get(`/api/packages/${packageId}/history`)
      return data.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch package history'
      throw err
    }
  }

  // ─── Bags ────────────────────────────────────────────────
  const bags = ref<Bag[]>([])
  async function fetchBags() {
    loading.value = true
    try {
      const { data } = await api.get<Bag[]>('/api/bags')
      bags.value = data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to load bags'
    } finally {
      loading.value = false
    }
  }

  async function createBag(payload: { bagCode: string; originRegionId: string; destRegionId: string }) {
    loading.value = true
    try {
      const { data } = await api.post<Bag>('/api/bags', payload)
      await fetchBags()
      return data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create bag'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addPackageToBag(bagId: string, packageId: string) {
    loading.value = true
    try {
      const { data } = await api.post(`/api/bags/${bagId}/packages`, { packageId })
      await fetchBags()
      return data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add package to bag'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removePackageFromBag(bagId: string, packageId: string) {
    loading.value = true
    try {
      await api.delete(`/api/bags/${bagId}/packages/${packageId}`)
      await fetchBags()
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to remove package from bag'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function sealBag(bagId: string, sealNumber: string) {
    loading.value = true
    try {
      const { data } = await api.patch(`/api/bags/${bagId}/seal`, { sealNumber })
      await fetchBags()
      return data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to seal bag'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Trucks ──────────────────────────────────────────────
  const trucks = ref<Truck[]>([])
  async function fetchTrucks() {
    loading.value = true
    try {
      const { data } = await api.get<Truck[]>('/api/trucks')
      trucks.value = data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to load trucks'
    } finally {
      loading.value = false
    }
  }

  async function createTruck(payload: { truckCode: string; capacity: number; currentRegionId: string }) {
    loading.value = true
    try {
      const { data } = await api.post<Truck>('/api/trucks', payload)
      await fetchTrucks()
      return data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create truck'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Schedules ───────────────────────────────────────────
  const schedules = ref<TruckSchedule[]>([])
  async function fetchSchedules() {
    loading.value = true
    try {
      const { data } = await api.get<TruckSchedule[]>('/api/truck-schedules')
      schedules.value = data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to load schedules'
    } finally {
      loading.value = false
    }
  }

  async function createSchedule(payload: {
    truckId: string
    routeDescription: string
    departureTime: string
    estimatedArrivalTime: string
    originRegionId: string
  }) {
    loading.value = true
    try {
      const { data } = await api.post<TruckSchedule>('/api/truck-schedules', payload)
      await fetchSchedules()
      return data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create schedule'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addBagToSchedule(scheduleId: string, bagId: string) {
    loading.value = true
    try {
      const { data } = await api.post(`/api/truck-schedules/${scheduleId}/bags`, { bagId })
      await fetchSchedules()
      return data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to add bag to schedule'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function departSchedule(scheduleId: string) {
    loading.value = true
    try {
      const { data } = await api.patch(`/api/truck-schedules/${scheduleId}/depart`)
      await fetchSchedules()
      return data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to depart truck schedule'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    activeRegionId,
    dashboardData,
    newArrivals,
    truckArrivals,
    loadedPackages,
    delayedPackages,
    fetchDashboard,
    regions,
    fetchRegions,
    createRegion,
    packages,
    fetchPackages,
    registerPackage,
    updatePackageStatus,
    getPackageHistory,
    bags,
    fetchBags,
    createBag,
    addPackageToBag,
    removePackageFromBag,
    sealBag,
    trucks,
    fetchTrucks,
    createTruck,
    schedules,
    fetchSchedules,
    createSchedule,
    addBagToSchedule,
    departSchedule,
  }
})
