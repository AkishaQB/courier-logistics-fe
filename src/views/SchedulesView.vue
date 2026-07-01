<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useLogisticsStore } from '@/stores/logistics'
import type { TruckSchedule, Bag } from '@/types'

const logisticsStore = useLogisticsStore()

// State
const showCreateModal = ref(false)
const selectedSchedule = ref<TruckSchedule | null>(null)

watch(
  () => logisticsStore.activeRegionId,
  () => {
    selectedSchedule.value = null
  }
)

// Create Schedule Form
const truckId = ref('')
const routeDescription = ref('')
const departureTime = ref('')
const estimatedArrivalTime = ref('')
const originRegionId = ref('')

const createError = ref<string | null>(null)
const createSuccess = ref<string | null>(null)
const createSubmitting = ref(false)

// Load Bag Form
const bagToLoadId = ref('')
const loadBagError = ref<string | null>(null)
const loadBagSubmitting = ref(false)

const departSubmitting = ref(false)

onMounted(async () => {
  await Promise.all([
    logisticsStore.fetchRegions(),
    logisticsStore.fetchTrucks(),
    logisticsStore.fetchBags(),
    logisticsStore.fetchSchedules()
  ])
})

// Sealed bags at schedule origin region that can be loaded to this schedule
const availableBags = computed(() => {
  if (!selectedSchedule.value) return []
  const originId = selectedSchedule.value.truck?.currentRegionId || (selectedSchedule.value as any).originRegionId
  
  return logisticsStore.bags.filter(
    (bag) =>
      bag.originRegionId === originId &&
      bag.isSealed &&
      !logisticsStore.schedules.some(s => s.bags?.some(b => b.id === bag.id))
  )
})

async function handleCreateSchedule() {
  createError.value = null
  createSuccess.value = null

  if (!truckId.value || !routeDescription.value || !departureTime.value || !estimatedArrivalTime.value || !originRegionId.value) {
    createError.value = 'All fields are required'
    return
  }

  createSubmitting.value = true
  try {
    await logisticsStore.createSchedule({
      truckId: truckId.value,
      routeDescription: routeDescription.value.trim(),
      departureTime: new Date(departureTime.value).toISOString(),
      estimatedArrivalTime: new Date(estimatedArrivalTime.value).toISOString(),
      originRegionId: originRegionId.value
    })
    createSuccess.value = 'Schedule created successfully!'
    
    // Clear form
    truckId.value = ''
    routeDescription.value = ''
    departureTime.value = ''
    estimatedArrivalTime.value = ''
    originRegionId.value = ''

    setTimeout(() => {
      showCreateModal.value = false
      createSuccess.value = null
    }, 1500)
  } catch (err: any) {
    createError.value = err.response?.data?.error || 'Failed to create schedule'
  } finally {
    createSubmitting.value = false
  }
}

async function selectSchedule(sched: TruckSchedule) {
  selectedSchedule.value = sched
  bagToLoadId.value = ''
  loadBagError.value = null
}

async function handleLoadBag() {
  if (!selectedSchedule.value || !bagToLoadId.value) return
  loadBagError.value = null
  loadBagSubmitting.value = true

  try {
    await logisticsStore.addBagToSchedule(selectedSchedule.value.id, bagToLoadId.value)
    
    // Refresh schedule details
    const updated = logisticsStore.schedules.find(s => s.id === selectedSchedule.value?.id)
    if (updated) selectedSchedule.value = updated
    
    bagToLoadId.value = ''
  } catch (err: any) {
    loadBagError.value = err.response?.data?.error || 'Failed to load bag'
  } finally {
    loadBagSubmitting.value = false
  }
}

async function handleDepart() {
  if (!selectedSchedule.value) return
  if (!confirm('Are you sure you want to dispatch this vehicle? All loaded bags and packages will be updated to Transit status.')) return
  
  departSubmitting.value = true
  try {
    await logisticsStore.departSchedule(selectedSchedule.value.id)
    const updated = logisticsStore.schedules.find(s => s.id === selectedSchedule.value?.id)
    if (updated) selectedSchedule.value = updated
    alert('Truck dispatched successfully! Webhooks sent to track database.')
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to dispatch schedule')
  } finally {
    departSubmitting.value = false
  }
}

const arriveSubmitting = ref(false)

async function handleArrive() {
  if (!selectedSchedule.value) return
  if (!confirm('Are you sure you want to authorize arrival for this vehicle? All loaded bags will be marked as Delivered and packages will be set to Arrived status at their destination hubs.')) return

  arriveSubmitting.value = true
  try {
    await logisticsStore.updateSchedule(selectedSchedule.value.id, { status: 'arrived' })
    
    const updated = logisticsStore.schedules.find(s => s.id === selectedSchedule.value?.id)
    if (updated) selectedSchedule.value = updated

    alert('Vehicle arrival authorized successfully! Cargo manifest unloaded and webhooks triggered.')
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to authorize vehicle arrival')
  } finally {
    arriveSubmitting.value = false
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'scheduled': return 'badge badge--warning'
    case 'departed':
    case 'in_transit': return 'badge badge--info'
    case 'arrived': return 'badge badge--success'
    default: return 'badge badge--danger'
  }
}

function formatTime(isoStr: string) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString()
}
</script>

<template>
  <div class="schedules-view">
    <div class="header-section">
      <div>
        <h1 class="page-title">Linehaul Schedules</h1>
        <p class="page-subtitle">Schedule long-distance vehicle routing and manage cargo dispatching</p>
      </div>
      <button @click="showCreateModal = true" class="create-btn">
        ➕ Create Dispatch Route
      </button>
    </div>

    <!-- Main Grid -->
    <div class="ops-grid">
      <!-- Schedules List -->
      <div class="card" :class="{ 'col-2': !selectedSchedule }">
        <h3 class="card-title">Staged & En-route Dispatches</h3>
        <p class="card-subtitle">Active linehaul truck departures</p>

        <div v-if="logisticsStore.loading && !logisticsStore.schedules.length" class="empty-state">
          Loading schedules...
        </div>
        <div v-else-if="logisticsStore.schedules.length === 0" class="empty-state">
          No schedules dispatched or scheduled yet.
        </div>
        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Truck</th>
                <th>Route Description</th>
                <th>Departure Time</th>
                <th>Arrival Time (Est.)</th>
                <th>Bags Staged</th>
                <th>Trip Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="sched in logisticsStore.schedules"
                :key="sched.id"
                :class="{ 'active-row': selectedSchedule?.id === sched.id }"
                @click="selectSchedule(sched)"
                class="clickable-row"
              >
                <td class="font-mono text-accent font-semibold">🚛 {{ sched.truck?.truckCode || '??' }}</td>
                <td>{{ sched.routeDescription }}</td>
                <td>{{ formatTime(sched.scheduledDeparture) }}</td>
                <td>{{ formatTime(sched.estimatedArrivalTime) }}</td>
                <td>{{ sched.bags?.length || 0 }} bags</td>
                <td>
                  <span :class="getStatusBadgeClass(sched.status)">
                    {{ sched.status.replace(/_/g, ' ') }}
                  </span>
                </td>
                <td>
                  <button class="manage-row-btn">Dispatch Control</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div v-if="logisticsStore.schedulesTotalPages > 1" class="pagination-controls">
          <button 
            @click="logisticsStore.fetchSchedules(logisticsStore.schedulesPage - 1)" 
            :disabled="logisticsStore.schedulesPage <= 1"
            class="pagination-btn"
          >
            ◀ Prev
          </button>
          <span class="pagination-info">
            Page {{ logisticsStore.schedulesPage }} of {{ logisticsStore.schedulesTotalPages }}
            ({{ logisticsStore.schedulesTotal }} total)
          </span>
          <button 
            @click="logisticsStore.fetchSchedules(logisticsStore.schedulesPage + 1)" 
            :disabled="logisticsStore.schedulesPage >= logisticsStore.schedulesTotalPages"
            class="pagination-btn"
          >
            Next ▶
          </button>
        </div>
      </div>

      <!-- Schedule Manager panel -->
      <div v-if="selectedSchedule" class="card schedule-details-panel animate-slide-in">
        <div class="panel-header">
          <h3 class="card-title">Dispatch Control Panel</h3>
          <button @click="selectedSchedule = null" class="close-btn">✕ Close</button>
        </div>

        <div class="package-meta-info">
          <div class="meta-item">
            <span class="meta-label">Transport Vehicle</span>
            <span class="meta-value font-mono text-accent">🚛 {{ selectedSchedule.truck?.truckCode }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Trip Status</span>
            <span :class="getStatusBadgeClass(selectedSchedule.status)">
              {{ selectedSchedule.status.replace(/_/g, ' ') }}
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Linehaul Route</span>
            <span class="meta-value">{{ selectedSchedule.routeDescription }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Est. Arrival</span>
            <span class="meta-value">{{ formatTime(selectedSchedule.estimatedArrivalTime) }}</span>
          </div>
        </div>

        <!-- Add Bag to Schedule form -->
        <div v-if="selectedSchedule.status === 'scheduled'" class="bag-action-section">
          <h4 class="section-title">Stage Sealed Bag on Vehicle</h4>
          <form @submit.prevent="handleLoadBag" class="load-bag-form">
            <div class="form-row">
              <select v-model="bagToLoadId" class="form-select flex-1">
                <option value="">Select sealed bag at origin hub...</option>
                <option 
                  v-for="bag in availableBags" 
                  :key="bag.id" 
                  :value="bag.id"
                >
                  {{ bag.bagCode }} (➔ {{ bag.destRegion?.regionCode }} | {{ bag.packages?.length }} items)
                </option>
              </select>
              <button type="submit" class="pack-btn" :disabled="loadBagSubmitting || !bagToLoadId">
                Load Bag
              </button>
            </div>
            <div v-if="loadBagError" class="alert alert--danger">{{ loadBagError }}</div>
          </form>
        </div>

        <!-- Dispatch / Depart action -->
        <div v-if="selectedSchedule.status === 'scheduled'" class="dispatch-action-section">
          <h4 class="section-title">Vehicle Dispatch authorization</h4>
          <button 
            @click="handleDepart" 
            class="depart-authorization-btn"
            :disabled="departSubmitting || !selectedSchedule.bags?.length"
          >
            Authorize Route Departure 🚀
          </button>
          <p v-if="!selectedSchedule.bags?.length" class="helper-text text-danger">
            At least one sealed bag must be loaded before authorization can be granted.
          </p>
        </div>

        <!-- Arrival action -->
        <div v-if="selectedSchedule.status === 'departed'" class="dispatch-action-section">
          <h4 class="section-title">Vehicle Arrival authorization</h4>
          <button 
            @click="handleArrive" 
            class="arrive-authorization-btn"
            :disabled="arriveSubmitting"
          >
            Authorize Route Arrival 🏁
          </button>
        </div>

        <!-- Loaded Bags List -->
        <div class="loaded-bags-section">
          <h4 class="section-title">Loaded Cargo Manifest ({{ selectedSchedule.bags?.length || 0 }} Bags)</h4>
          <div v-if="!selectedSchedule.bags?.length" class="empty-state">
            No bags staged on this vehicle yet.
          </div>
          <div v-else class="bag-manifest-list">
            <div v-for="bag in selectedSchedule.bags" :key="bag.id" class="loaded-bag-item">
              <div class="bag-item-header">
                <span class="font-mono font-semibold text-accent">👜 {{ bag.bagCode }}</span>
                <span class="seal-no">Seal: {{ bag.sealNumber }}</span>
              </div>
              <div class="bag-item-meta">
                <span>Route: {{ bag.originRegion?.regionCode }} ➔ {{ bag.destRegion?.regionCode }}</span>
                <span>{{ bag.packages?.length || 0 }} Items loaded</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Schedule Modal -->
    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="card-title">Schedule Route Dispatch</h3>
          <button @click="showCreateModal = false" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="handleCreateSchedule" class="modal-form">
          <div class="form-group">
            <label class="form-label">Linehaul Vehicle *</label>
            <select v-model="truckId" required class="form-select">
              <option value="">Select Available Truck</option>
              <option v-for="t in logisticsStore.trucks" :key="t.id" :value="t.id">
                {{ t.truckCode }} (Capacity: {{ t.capacity }}kg)
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Route Description (e.g. Bangkok to Chiang Mai Hub) *</label>
            <input v-model="routeDescription" type="text" required placeholder="Bangkok Express Route" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">Origin Hub *</label>
            <select v-model="originRegionId" required class="form-select">
              <option value="">Select Origin</option>
              <option v-for="r in logisticsStore.regions" :key="r.id" :value="r.id">
                {{ r.regionCode }} - {{ r.regionName }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Scheduled Departure Time *</label>
            <input v-model="departureTime" type="datetime-local" required class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">Est. Arrival Time *</label>
            <input v-model="estimatedArrivalTime" type="datetime-local" required class="form-input" />
          </div>

          <div v-if="createError" class="alert alert--danger">{{ createError }}</div>
          <div v-if="createSuccess" class="alert alert--success">{{ createSuccess }}</div>

          <div class="modal-footer">
            <button type="button" @click="showCreateModal = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="createSubmitting">
              <span v-if="createSubmitting" class="spinner"></span>
              <span v-else>Schedule Trip</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedules-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 2px;
}

.page-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.create-btn {
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  border: none;
  color: white;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.create-btn:hover {
  background: #2563eb;
}

.ops-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--space-lg);
  align-items: start;
}

@media (max-width: 1024px) {
  .ops-grid {
    grid-template-columns: 1fr;
  }
}

.col-2 {
  grid-column: span 2;
}

.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
}

.card-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  margin-bottom: var(--space-md);
}

.clickable-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.clickable-row:hover {
  background: var(--color-bg-card-hover);
}

.active-row td {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
}

.manage-row-btn {
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 0.75rem;
  cursor: pointer;
}

.manage-row-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* Detail Panel */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.close-btn {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.75rem;
}

.package-meta-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-primary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  margin-bottom: var(--space-lg);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.meta-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 700;
  margin-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 4px;
}

/* Actions */
.bag-action-section,
.dispatch-action-section {
  margin-bottom: var(--space-lg);
}

.form-row {
  display: flex;
  gap: var(--space-sm);
}

.flex-1 {
  flex: 1;
}

.form-input,
.form-select {
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.875rem;
}

.pack-btn {
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  border: none;
  color: white;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pack-btn:hover {
  background: #2563eb;
}

.pack-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.depart-authorization-btn {
  width: 100%;
  padding: 0.875rem;
  border-radius: var(--radius-sm);
  background: var(--color-success);
  border: none;
  color: white;
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.depart-authorization-btn:hover:not(:disabled) {
  background: #059669;
}

.depart-authorization-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.arrive-authorization-btn {
  width: 100%;
  padding: 0.875rem;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  border: none;
  color: white;
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.arrive-authorization-btn:hover:not(:disabled) {
  background: #4f46e5;
}

.arrive-authorization-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.helper-text {
  font-size: 0.75rem;
  margin-top: 4px;
}

/* Loaded bags manifest */
.bag-manifest-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.loaded-bag-item {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
}

.bag-item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.seal-no {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.bag-item-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
}

.modal-card {
  width: 100%;
  max-width: 550px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-xs);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-md);
}

.cancel-btn {
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-text-muted);
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  border: none;
  color: white;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
}

.data-table th {
  background: var(--color-bg-primary);
  padding: var(--space-sm) var(--space-md);
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.data-table td {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.data-table tr:last-child td {
  border-bottom: none;
}

/* Alert styles */
.alert {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  line-height: 1.4;
  margin-top: var(--space-sm);
}

.alert--danger {
  background: var(--color-danger-soft);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--color-danger);
}

.alert--success {
  background: var(--color-success-soft);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: var(--color-success);
}

.font-mono { font-family: monospace; }
.font-semibold { font-weight: 600; }
.text-accent { color: var(--color-accent); }
.text-secondary { color: var(--color-text-secondary); }
.text-muted { color: var(--color-text-muted); }
.text-danger { color: var(--color-danger); }
.text-xs { font-size: 0.75rem; }

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.pagination-btn {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}
</style>
