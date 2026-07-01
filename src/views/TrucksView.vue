<script setup lang="ts">
import { onMounted, ref } from 'vue'
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

onMounted(async () => {
  await Promise.all([
    logisticsStore.fetchRegions(),
    logisticsStore.fetchTrucks()
  ])
})

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

    <!-- Main Card container -->
    <div class="card">
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
              <th>Current staging Hub</th>
              <th>Registration Date</th>
              <th>Vehicle ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="truck in logisticsStore.trucks" :key="truck.id">
              <td class="font-mono text-accent font-semibold">🚛 {{ truck.truckCode }}</td>
              <td>{{ truck.capacity }} kg</td>
              <td>
                <span class="hub-location">
                  📍 {{ truck.currentRegion?.regionName || 'Outside network' }} ({{ truck.currentRegion?.regionCode || '??' }})
                </span>
              </td>
              <td>{{ new Date(truck.createdAt).toLocaleDateString() }}</td>
              <td class="font-mono text-muted text-xs">{{ truck.id }}</td>
            </tr>
          </tbody>
        </table>
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

.close-btn {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.75rem;
}

.modal-form {
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

.submit-btn:hover:not(:disabled) {
  background: #2563eb;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
</style>
