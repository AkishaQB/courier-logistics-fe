<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useLogisticsStore } from '@/stores/logistics'
import type { Bag, Package } from '@/types'

const logisticsStore = useLogisticsStore()

// State
const showCreateModal = ref(false)
const selectedBag = ref<Bag | null>(null)

// Create Bag Form
const bagCode = ref('')
const originRegionId = ref('')
const destRegionId = ref('')

const createError = ref<string | null>(null)
const createSuccess = ref<string | null>(null)
const createSubmitting = ref(false)

// Seal Bag Form
const sealNumber = ref('')
const sealError = ref<string | null>(null)
const sealSuccess = ref<string | null>(null)
const sealSubmitting = ref(false)

// Add Package state
const packageToAddId = ref('')
const addPackageError = ref<string | null>(null)
const addPackageSubmitting = ref(false)

onMounted(async () => {
  await Promise.all([
    logisticsStore.fetchRegions(),
    logisticsStore.fetchBags(),
    logisticsStore.fetchPackages()
  ])
})

// Unbagged packages at origin region that can be added to this bag
const availablePackages = computed(() => {
  if (!selectedBag.value) return []
  return logisticsStore.packages.filter(
    (pkg) =>
      pkg.currentRegionId === selectedBag.value?.originRegionId &&
      (pkg.currentStatus === 'picked_up' || pkg.currentStatus === 'to_be_picked_up' || pkg.currentStatus === 'arrived')
  )
})

async function handleCreateBag() {
  createError.value = null
  createSuccess.value = null
  
  if (!bagCode.value || !originRegionId.value || !destRegionId.value) {
    createError.value = 'All fields are required'
    return
  }

  createSubmitting.value = true
  try {
    await logisticsStore.createBag({
      bagCode: bagCode.value.toUpperCase().trim(),
      originRegionId: originRegionId.value,
      destRegionId: destRegionId.value
    })
    createSuccess.value = 'Bag created successfully!'
    bagCode.value = ''
    originRegionId.value = ''
    destRegionId.value = ''
    
    setTimeout(() => {
      showCreateModal.value = false
      createSuccess.value = null
    }, 1500)
  } catch (err: any) {
    createError.value = err.response?.data?.error || 'Failed to create bag'
  } finally {
    createSubmitting.value = false
  }
}

async function selectBag(bag: Bag) {
  selectedBag.value = bag
  sealNumber.value = bag.sealNumber || ''
  sealError.value = null
  sealSuccess.value = null
  packageToAddId.value = ''
  addPackageError.value = null
}

async function handleAddPackage() {
  if (!selectedBag.value || !packageToAddId.value) return
  addPackageError.value = null
  addPackageSubmitting.value = true

  try {
    await logisticsStore.addPackageToBag(selectedBag.value.id, packageToAddId.value)
    
    // Refresh bag details
    const updatedBag = logisticsStore.bags.find(b => b.id === selectedBag.value?.id)
    if (updatedBag) selectedBag.value = updatedBag
    
    packageToAddId.value = ''
  } catch (err: any) {
    addPackageError.value = err.response?.data?.error || 'Failed to add package'
  } finally {
    addPackageSubmitting.value = false
  }
}

async function handleRemovePackage(pkgId: string) {
  if (!selectedBag.value) return
  try {
    await logisticsStore.removePackageFromBag(selectedBag.value.id, pkgId)
    
    // Refresh bag details
    const updatedBag = logisticsStore.bags.find(b => b.id === selectedBag.value?.id)
    if (updatedBag) selectedBag.value = updatedBag
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to remove package')
  }
}

async function handleSealBag() {
  if (!selectedBag.value || !sealNumber.value) return
  sealError.value = null
  sealSuccess.value = null
  sealSubmitting.value = true

  try {
    const sealed = await logisticsStore.sealBag(selectedBag.value.id, sealNumber.value.trim())
    sealSuccess.value = 'Bag sealed successfully!'
    
    // Refresh bag details
    selectedBag.value = sealed
  } catch (err: any) {
    sealError.value = err.response?.data?.error || 'Failed to seal bag'
  } finally {
    sealSubmitting.value = false
  }
}
</script>

<template>
  <div class="bags-view">
    <div class="header-section">
      <div>
        <h1 class="page-title">Bag Sorting & Consolidation</h1>
        <p class="page-subtitle">Consolidate multiple packages into sealed shipping bags for transit</p>
      </div>
      <button @click="showCreateModal = true" class="create-btn">
        ➕ Create Shipping Bag
      </button>
    </div>

    <!-- Main Grid layout -->
    <div class="ops-grid">
      <!-- Bags List -->
      <div class="card" :class="{ 'col-2': !selectedBag }">
        <h3 class="card-title">Sealed & Open Bags</h3>
        <p class="card-subtitle">List of bags registered in the transit network</p>

        <div v-if="logisticsStore.loading && !logisticsStore.bags.length" class="empty-state">
          Loading bags...
        </div>
        <div v-else-if="logisticsStore.bags.length === 0" class="empty-state">
          No bags created yet.
        </div>
        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Bag Code</th>
                <th>Route (Hub to Hub)</th>
                <th>Packages</th>
                <th>Sealed Status</th>
                <th>Seal Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="bag in logisticsStore.bags"
                :key="bag.id"
                :class="{ 'active-row': selectedBag?.id === bag.id }"
                @click="selectBag(bag)"
                class="clickable-row"
              >
                <td class="font-mono text-accent font-semibold">{{ bag.bagCode }}</td>
                <td>
                  {{ bag.originRegion?.regionCode || '??' }} ➔ {{ bag.destRegion?.regionCode || '??' }}
                </td>
                <td>{{ bag.packages?.length || 0 }} items</td>
                <td>
                  <span 
                    class="seal-badge" 
                    :class="bag.isSealed ? 'seal-badge--sealed' : 'seal-badge--open'"
                  >
                    {{ bag.isSealed ? 'Sealed' : 'Open' }}
                  </span>
                </td>
                <td class="font-mono">{{ bag.sealNumber || '—' }}</td>
                <td>
                  <button class="manage-row-btn">Consolidate</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div v-if="logisticsStore.bagsTotalPages > 1" class="pagination-controls">
          <button 
            @click="logisticsStore.fetchBags(logisticsStore.bagsPage - 1)" 
            :disabled="logisticsStore.bagsPage <= 1"
            class="pagination-btn"
          >
            ◀ Prev
          </button>
          <span class="pagination-info">
            Page {{ logisticsStore.bagsPage }} of {{ logisticsStore.bagsTotalPages }}
            ({{ logisticsStore.bagsTotal }} total)
          </span>
          <button 
            @click="logisticsStore.fetchBags(logisticsStore.bagsPage + 1)" 
            :disabled="logisticsStore.bagsPage >= logisticsStore.bagsTotalPages"
            class="pagination-btn"
          >
            Next ▶
          </button>
        </div>
      </div>

      <!-- Bag Consolidation Manager Panel -->
      <div v-if="selectedBag" class="card bag-details-panel animate-slide-in">
        <div class="panel-header">
          <h3 class="card-title">Bag Consolidation</h3>
          <button @click="selectedBag = null" class="close-btn">✕ Close</button>
        </div>

        <div class="package-meta-info">
          <div class="meta-item">
            <span class="meta-label">Bag Code</span>
            <span class="meta-value font-mono text-accent">{{ selectedBag.bagCode }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Consolidation Route</span>
            <span class="meta-value">
              {{ selectedBag.originRegion?.regionName }} ➔ {{ selectedBag.destRegion?.regionName }}
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Status</span>
            <span 
              class="seal-badge" 
              :class="selectedBag.isSealed ? 'seal-badge--sealed' : 'seal-badge--open'"
            >
              {{ selectedBag.isSealed ? 'Sealed' : 'Open' }}
            </span>
          </div>
          <div class="meta-item" v-if="selectedBag.sealNumber">
            <span class="meta-label">Seal Number</span>
            <span class="meta-value font-mono">{{ selectedBag.sealNumber }}</span>
          </div>
        </div>

        <!-- Pack items / Add Package form -->
        <div v-if="!selectedBag.isSealed" class="bag-action-section">
          <h4 class="section-title">Scan / Add Package to Bag</h4>
          <form @submit.prevent="handleAddPackage" class="add-package-form">
            <div class="form-row">
              <select v-model="packageToAddId" class="form-select flex-1">
                <option value="">Select package waiting transfer...</option>
                <option 
                  v-for="pkg in availablePackages" 
                  :key="pkg.id" 
                  :value="pkg.id"
                >
                  {{ pkg.trackingId }} ({{ pkg.receiverName }} - {{ pkg.weightKg }}kg)
                </option>
              </select>
              <button type="submit" class="pack-btn" :disabled="addPackageSubmitting || !packageToAddId">
                Pack Item
              </button>
            </div>
            <div v-if="addPackageError" class="alert alert--danger">{{ addPackageError }}</div>
          </form>
        </div>

        <!-- Seal Bag form -->
        <div v-if="!selectedBag.isSealed" class="bag-action-section">
          <h4 class="section-title">Seal Bag for Route Dispatch</h4>
          <form @submit.prevent="handleSealBag" class="seal-form">
            <div class="form-row">
              <input
                v-model="sealNumber"
                type="text"
                required
                placeholder="Enter unique metal seal number"
                class="form-input flex-1"
              />
              <button type="submit" class="seal-btn" :disabled="sealSubmitting || !sealNumber">
                Seal & Close Bag
              </button>
            </div>
            <div v-if="sealError" class="alert alert--danger">{{ sealError }}</div>
            <div v-if="sealSuccess" class="alert alert--success">{{ sealSuccess }}</div>
          </form>
        </div>

        <!-- Bag items manifest list -->
        <div class="bag-manifest-section">
          <h4 class="section-title">Bag Manifest ({{ selectedBag.packages?.length || 0 }} Packages)</h4>
          <div v-if="!selectedBag.packages?.length" class="empty-state">
            This bag is empty.
          </div>
          <div v-else class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Receiver</th>
                  <th>Weight</th>
                  <th v-if="!selectedBag.isSealed">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pkg in selectedBag.packages" :key="pkg.id">
                  <td class="font-mono text-xs text-accent">{{ pkg.trackingId }}</td>
                  <td>{{ pkg.receiverName }}</td>
                  <td>{{ pkg.weightKg }} kg</td>
                  <td v-if="!selectedBag.isSealed">
                    <button 
                      @click="handleRemovePackage(pkg.id)" 
                      class="remove-item-btn"
                    >
                      Unpack
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Bag Modal -->
    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="card-title">Create Shipping Bag</h3>
          <button @click="showCreateModal = false" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="handleCreateBag" class="modal-form">
          <div class="form-group">
            <label class="form-label">Bag Code / Identifier *</label>
            <input v-model="bagCode" type="text" required placeholder="e.g. BAG-001" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">Origin Hub *</label>
            <select v-model="originRegionId" required class="form-select">
              <option value="">Select Origin Hub</option>
              <option v-for="r in logisticsStore.regions" :key="r.id" :value="r.id">
                {{ r.regionCode }} - {{ r.regionName }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Destination Hub *</label>
            <select v-model="destRegionId" required class="form-select">
              <option value="">Select Destination Hub</option>
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
              <span v-else>Create Bag</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bags-view {
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

/* Bag actions */
.bag-action-section {
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

.pack-btn,
.seal-btn {
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

.pack-btn:hover,
.seal-btn:hover {
  background: #2563eb;
}

.pack-btn:disabled,
.seal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.remove-item-btn {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-danger-soft);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--color-danger);
  font-size: 0.75rem;
  cursor: pointer;
}

.remove-item-btn:hover {
  background: var(--color-danger);
  color: white;
}

/* Badges */
.seal-badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.seal-badge--sealed {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.seal-badge--open {
  background: var(--color-warning-soft);
  color: var(--color-warning);
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
