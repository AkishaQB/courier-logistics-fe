<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useLogisticsStore } from '@/stores/logistics'

const logisticsStore = useLogisticsStore()

const showCreateModal = ref(false)

// Form state
const truckCode = ref('')
const capacity = ref(1000)
const currentRegionId = ref('')

const createError = ref<string | null>(null)
const createSuccess = ref<string | null>(null)
const createSubmitting = ref(false)

// Manage truck state
const selectedTruck = ref<any | null>(null)
const updateTruckStatus = ref('idle')
const updateTruckRegionId = ref('')
const updateSubmitting = ref(false)
const updateError = ref<string | null>(null)
const updateSuccess = ref<string | null>(null)

onMounted(async () => {
  await Promise.all([
    logisticsStore.fetchRegions(),
    logisticsStore.fetchTrucks()
  ])
})

// Refetch trucks when active hub changes
watch(
  () => logisticsStore.activeRegionId,
  async () => {
    selectedTruck.value = null
    await logisticsStore.fetchTrucks()
  }
)

async function handleCreateTruck() {
  createError.value = null
  createSuccess.value = null

  if (!truckCode.value || !capacity.value || !currentRegionId.value) {
    createError.value = 'All fields are required'
    return
  }

  createSubmitting.value = true
  try {
    await logisticsStore.createTruck({
      truckCode: truckCode.value.toUpperCase().trim(),
      capacity: Number(capacity.value),
      currentRegionId: currentRegionId.value
    })
    createSuccess.value = 'Truck registered successfully!'
    truckCode.value = ''
    capacity.value = 1000
    currentRegionId.value = ''

    setTimeout(() => {
      showCreateModal.value = false
      createSuccess.value = null
    }, 1500)
  } catch (err: any) {
    createError.value = err.response?.data?.error || 'Failed to register truck'
  } finally {
    createSubmitting.value = false
  }
}

function selectTruck(truck: any) {
  selectedTruck.value = truck
  updateTruckStatus.value = truck.status
  updateTruckRegionId.value = truck.currentRegionId || ''
  updateError.value = null
  updateSuccess.value = null
}

async function handleUpdateTruck() {
  if (!selectedTruck.value) return
  updateError.value = null
  updateSuccess.value = null
  updateSubmitting.value = true

  try {
    await logisticsStore.updateTruck(selectedTruck.value.id, {
      status: updateTruckStatus.value,
      currentRegionId: updateTruckRegionId.value
    })
    updateSuccess.value = 'Truck state updated successfully!'
    
    // Refresh selected truck details
    const refreshed = logisticsStore.trucks.find(t => t.id === selectedTruck.value.id)
    if (refreshed) selectedTruck.value = refreshed
  } catch (err: any) {
    updateError.value = err.response?.data?.error || 'Failed to update truck state'
  } finally {
    updateSubmitting.value = false
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'idle': return 'badge badge--success'
    case 'loading': return 'badge badge--warning'
    case 'in_transit': return 'badge badge--info'
    default: return 'badge badge--danger'
  }
}
</script>

<template>
  <div class="trucks-view">
    <div class="header-section">
      <div>
        <h1 class="page-title">Fleet Logistics</h1>
        <p class="page-subtitle">Manage linehaul trucks, cargo capacities, and hub assignments</p>
      </div>
      <button @click="showCreateModal = true" class="create-btn">
        ➕ Register Transit Truck
      </button>
    </div>

    <!-- Main Grid layout -->
    <div class="ops-grid">
      <!-- Registry List -->
      <div class="card" :class="{ 'col-2': !selectedTruck }">
        <h3 class="card-title">Registered Fleet Registry</h3>
        <p class="card-subtitle">Active linehaul vehicles and their current staging hubs</p>

        <div v-if="logisticsStore.loading && !logisticsStore.trucks.length" class="empty-state">
          Loading fleet registry...
        </div>
        <div v-else-if="logisticsStore.trucks.length === 0" class="empty-state">
          No staging trucks registered in the database.
        </div>
        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Truck Code</th>
                <th>Maximum Capacity</th>
                <th>Current Status</th>
                <th>Current staging Hub</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="truck in logisticsStore.trucks" 
                :key="truck.id"
                :class="{ 'active-row': selectedTruck?.id === truck.id }"
                @click="selectTruck(truck)"
                class="clickable-row"
              >
                <td class="font-mono text-accent font-semibold">🚛 {{ truck.truckCode }}</td>
                <td>{{ truck.capacity }} kg</td>
                <td>
                  <span class="badge" :class="getStatusBadgeClass(truck.status)">
                    {{ truck.status }}
                  </span>
                </td>
                <td>
                  <span class="hub-location">
                    📍 {{ truck.currentRegion?.regionName || 'Outside network' }} ({{ truck.currentRegion?.regionCode || '??' }})
                  </span>
                </td>
                <td>
                  <button class="manage-row-btn">Manage</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div v-if="logisticsStore.trucksTotalPages > 1" class="pagination-controls">
          <button 
            @click="logisticsStore.fetchTrucks(logisticsStore.trucksPage - 1)" 
            :disabled="logisticsStore.trucksPage <= 1"
            class="pagination-btn"
          >
            ◀ Prev
          </button>
          <span class="pagination-info">
            Page {{ logisticsStore.trucksPage }} of {{ logisticsStore.trucksTotalPages }}
            ({{ logisticsStore.trucksTotal }} total)
          </span>
          <button 
            @click="logisticsStore.fetchTrucks(logisticsStore.trucksPage + 1)" 
            :disabled="logisticsStore.trucksPage >= logisticsStore.trucksTotalPages"
            class="pagination-btn"
          >
            Next ▶
          </button>
        </div>
      </div>

      <!-- Selected Truck Panel -->
      <div v-if="selectedTruck" class="card package-details-panel animate-slide-in">
        <div class="panel-header">
          <h3 class="card-title">Manage Truck</h3>
          <button @click="selectedTruck = null" class="close-btn">✕ Close</button>
        </div>

        <div class="package-meta-info">
          <div class="meta-item">
            <span class="meta-label">Truck Code</span>
            <span class="meta-value font-mono text-accent">{{ selectedTruck.truckCode }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Maximum Capacity</span>
            <span class="meta-value">{{ selectedTruck.capacity }} kg</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Current Status</span>
            <span class="badge" :class="getStatusBadgeClass(selectedTruck.status)">
              {{ selectedTruck.status }}
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Staging Hub</span>
            <span class="meta-value">{{ selectedTruck.currentRegion?.regionName || 'Outside' }}</span>
          </div>
        </div>

        <!-- Status update form -->
        <div class="status-update-section">
          <h4 class="section-title">Update Status / Assignment</h4>
          <form @submit.prevent="handleUpdateTruck" class="update-form">
            <div class="form-group">
              <label for="updateTruckStatus" class="form-label">Vehicle Status</label>
              <select id="updateTruckStatus" v-model="updateTruckStatus" class="form-select">
                <option value="idle">Idle / Ready</option>
                <option value="loading">Loading Staging Cargo</option>
                <option value="in_transit">In Transit / Dispatch</option>
              </select>
            </div>

            <div class="form-group">
              <label for="updateTruckRegion" class="form-label">Relocate / Assign to Hub</label>
              <select id="updateTruckRegion" v-model="updateTruckRegionId" class="form-select">
                <option
                  v-for="reg in logisticsStore.regions"
                  :key="reg.id"
                  :value="reg.id"
                >
                  {{ reg.regionCode }} - {{ reg.regionName }}
                </option>
              </select>
            </div>

            <div v-if="updateError" class="alert alert--danger">{{ updateError }}</div>
            <div v-if="updateSuccess" class="alert alert--success">{{ updateSuccess }}</div>

            <button type="submit" class="submit-btn" :disabled="updateSubmitting">
              <span v-if="updateSubmitting" class="spinner"></span>
              <span v-else>Update Truck State</span>
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Create Truck Modal -->
    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="card-title">Register Cargo Truck</h3>
          <button @click="showCreateModal = false" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="handleCreateTruck" class="modal-form">
          <div class="form-group">
            <label class="form-label">Truck Code / Plate *</label>
            <input v-model="truckCode" type="text" required placeholder="e.g. TRK-BKK-001" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">Cargo Weight Capacity (kg) *</label>
            <input v-model="capacity" type="number" required placeholder="1000" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">Home Staging Hub *</label>
            <select v-model="currentRegionId" required class="form-select">
              <option value="">Select Hub</option>
              <option v-for="r in logisticsStore.regions" :key="r.id" :value="r.id">
                {{ r.regionCode }} - {{ r.regionName }}
              </option>
            </select>
          </div>

          <div v-if="createError" class="alert alert--danger">{{ createError }}</div>
          <div v-if="createSuccess" class="alert alert--success">{{ createSuccess }}</div>

          <div class="modal-footer">
            <button type="button" @click="showCreateModal = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="createSubmitting">
              <span v-if="createSubmitting" class="spinner"></span>
              <span v-else>Register Vehicle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trucks-view {
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
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  align-items: start;
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

.status-update-section {
  margin-bottom: var(--space-lg);
}

.update-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.875rem;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.75rem;
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

.submit-btn:hover:not(:disabled) {
  background: #2563eb;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  max-width: 500px;
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
