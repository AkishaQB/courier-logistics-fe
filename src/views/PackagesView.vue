<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useLogisticsStore } from '@/stores/logistics'
import type { Package, PackageStatusHistory } from '@/types'

const logisticsStore = useLogisticsStore()

// State for modals
const showRegisterModal = ref(false)
const selectedPackage = ref<Package | null>(null)
const selectedPackageHistory = ref<PackageStatusHistory[]>([])

// Form state for package registration
const trackingId = ref('')
const senderName = ref('')
const senderAddress = ref('')
const receiverName = ref('')
const receiverAddress = ref('')
const weightKg = ref(1.0)
const originRegionId = ref('')
const destRegionId = ref('')
const currentRegionId = ref('')

const registerError = ref<string | null>(null)
const registerSuccess = ref<string | null>(null)
const registerSubmitting = ref(false)

// Form state for status update
const updateStatus = ref('')
const updateNotes = ref('')
const updateRegionId = ref('')
const updateBagId = ref('')

const updateError = ref<string | null>(null)
const updateSuccess = ref<string | null>(null)
const updateSubmitting = ref(false)

onMounted(async () => {
  await Promise.all([
    logisticsStore.fetchRegions(),
    logisticsStore.fetchPackages(),
    logisticsStore.fetchBags()
  ])
})

// Refetch packages when active hub changes
watch(
  () => logisticsStore.activeRegionId,
  async () => {
    await logisticsStore.fetchPackages()
  }
)

async function handleRegisterPackage() {
  registerError.value = null
  registerSuccess.value = null

  if (!trackingId.value || !senderName.value || !senderAddress.value || !receiverName.value || !receiverAddress.value || !weightKg.value || !originRegionId.value || !destRegionId.value) {
    registerError.value = 'Please fill out all required fields'
    return
  }

  registerSubmitting.value = true
  try {
    const payload = {
      trackingId: trackingId.value.trim(),
      senderName: senderName.value.trim(),
      senderAddress: senderAddress.value.trim(),
      receiverName: receiverName.value.trim(),
      receiverAddress: receiverAddress.value.trim(),
      weightKg: Number(weightKg.value),
      originRegionId: originRegionId.value,
      destRegionId: destRegionId.value,
      currentRegionId: currentRegionId.value || originRegionId.value
    }

    await logisticsStore.registerPackage(payload)
    registerSuccess.value = 'Package registered successfully!'
    
    // Clear form
    trackingId.value = ''
    senderName.value = ''
    senderAddress.value = ''
    receiverName.value = ''
    receiverAddress.value = ''
    weightKg.value = 1.0
    originRegionId.value = ''
    destRegionId.value = ''
    currentRegionId.value = ''
    
    setTimeout(() => {
      showRegisterModal.value = false
      registerSuccess.value = null
    }, 1500)
  } catch (err: any) {
    registerError.value = err.response?.data?.error || err.response?.data?.message || 'Failed to register package'
  } finally {
    registerSubmitting.value = false
  }
}

async function selectPackage(pkg: Package) {
  selectedPackage.value = pkg
  updateStatus.value = pkg.currentStatus
  updateNotes.value = pkg.delayReason || ''
  updateRegionId.value = pkg.currentRegionId || ''
  updateBagId.value = ''
  updateError.value = null
  updateSuccess.value = null
  
  // Fetch status history
  try {
    selectedPackageHistory.value = await logisticsStore.getPackageHistory(pkg.id)
  } catch (err) {
    selectedPackageHistory.value = []
  }
}

async function handleUpdateStatus() {
  if (!selectedPackage.value) return
  updateError.value = null
  updateSuccess.value = null
  updateSubmitting.value = true

  try {
    const payload: any = {
      status: updateStatus.value,
    }
    if (updateNotes.value) payload.notes = updateNotes.value
    if (updateRegionId.value) payload.regionId = updateRegionId.value
    if (updateBagId.value) payload.bagId = updateBagId.value

    const updated = await logisticsStore.updatePackageStatus(selectedPackage.value.id, payload)
    updateSuccess.value = 'Package status updated successfully!'
    
    // Update local object
    selectedPackage.value = updated
    selectedPackageHistory.value = await logisticsStore.getPackageHistory(updated.id)
  } catch (err: any) {
    updateError.value = err.response?.data?.error || 'Failed to update status'
  } finally {
    updateSubmitting.value = false
  }
}

function getStatusBadgeClass(status: string) {
  return `badge badge--${status.replace(/_/g, '-')}`
}

function formatTime(isoStr: string) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString()
}
</script>

<template>
  <div class="packages-view">
    <div class="header-section">
      <div>
        <h1 class="page-title">Package Operations</h1>
        <p class="page-subtitle">Track, register, transit, and update package lifecycles</p>
      </div>
      <button @click="showRegisterModal = true" class="register-btn">
        ➕ Register Incoming Package
      </button>
    </div>

    <!-- Main Grid: Packages list & details -->
    <div class="ops-grid">
      <!-- Packages List Table -->
      <div class="card" :class="{ 'col-2': !selectedPackage }">
        <h3 class="card-title">Manifest Packages</h3>
        <p class="card-subtitle">Packages associated with selected active hub</p>

        <div v-if="logisticsStore.loading && !logisticsStore.packages.length" class="empty-state">
          Loading packages...
        </div>
        <div v-else-if="logisticsStore.packages.length === 0" class="empty-state">
          No packages found in this region.
        </div>
        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tracking ID</th>
                <th>Sender</th>
                <th>Recipient</th>
                <th>Weight</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="pkg in logisticsStore.packages" 
                :key="pkg.id"
                :class="{ 'active-row': selectedPackage?.id === pkg.id }"
                @click="selectPackage(pkg)"
                class="clickable-row"
              >
                <td class="font-mono text-accent font-semibold">{{ pkg.trackingId }}</td>
                <td>{{ pkg.senderName }}</td>
                <td>{{ pkg.receiverName }}</td>
                <td>{{ pkg.weightKg }} kg</td>
                <td>
                  <span :class="getStatusBadgeClass(pkg.currentStatus)">
                    {{ pkg.currentStatus.replace(/_/g, ' ') }}
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
        <div v-if="logisticsStore.packagesTotalPages > 1" class="pagination-controls">
          <button 
            @click="logisticsStore.fetchPackages(logisticsStore.packagesPage - 1)" 
            :disabled="logisticsStore.packagesPage <= 1"
            class="pagination-btn"
          >
            ◀ Prev
          </button>
          <span class="pagination-info">
            Page {{ logisticsStore.packagesPage }} of {{ logisticsStore.packagesTotalPages }}
            ({{ logisticsStore.packagesTotal }} total)
          </span>
          <button 
            @click="logisticsStore.fetchPackages(logisticsStore.packagesPage + 1)" 
            :disabled="logisticsStore.packagesPage >= logisticsStore.packagesTotalPages"
            class="pagination-btn"
          >
            Next ▶
          </button>
        </div>
      </div>

      <!-- Package Detail Panel -->
      <div v-if="selectedPackage" class="card package-details-panel animate-slide-in">
        <div class="panel-header">
          <h3 class="card-title">Manage Package</h3>
          <button @click="selectedPackage = null" class="close-btn">✕ Close</button>
        </div>

        <div class="package-meta-info">
          <div class="meta-item">
            <span class="meta-label">Tracking ID</span>
            <span class="meta-value font-mono text-accent">{{ selectedPackage.trackingId }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Current Status</span>
            <span :class="getStatusBadgeClass(selectedPackage.currentStatus)">
              {{ selectedPackage.currentStatus.replace(/_/g, ' ') }}
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Origin Hub</span>
            <span class="meta-value">{{ selectedPackage.originRegion?.regionName || 'Outside' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Destination Hub</span>
            <span class="meta-value">{{ selectedPackage.destRegion?.regionName || 'Outside' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Sender</span>
            <span class="meta-value">{{ selectedPackage.senderName }} ({{ selectedPackage.senderAddress }})</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Receiver</span>
            <span class="meta-value">{{ selectedPackage.receiverName }} ({{ selectedPackage.receiverAddress }})</span>
          </div>
        </div>

        <!-- Status update form -->
        <div class="status-update-section">
          <h4 class="section-title">Update Status / Dispatch</h4>
          <form @submit.prevent="handleUpdateStatus" class="update-form">
            <div class="form-group">
              <label for="updateStatus" class="form-label">New Status</label>
              <select id="updateStatus" v-model="updateStatus" class="form-select">
                <option value="to_be_picked_up">To Be Picked Up</option>
                <option value="picked_up">Picked Up</option>
                <option value="added_to_bag">Added To Bag</option>
                <option value="in_transit">In Transit</option>
                <option value="arrived">Arrived at Hub</option>
                <option value="scheduled_for_delivery">Scheduled For Delivery</option>
                <option value="out_for_delivery">Out For Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="delayed">Delayed / On Hold</option>
              </select>
            </div>

            <!-- Optional region transfer -->
            <div class="form-group">
              <label for="updateRegion" class="form-label">Transfer to Hub (Optional)</label>
              <select id="updateRegion" v-model="updateRegionId" class="form-select">
                <option value="">No Change</option>
                <option
                  v-for="reg in logisticsStore.regions"
                  :key="reg.id"
                  :value="reg.id"
                >
                  {{ reg.regionCode }} - {{ reg.regionName }}
                </option>
              </select>
            </div>

            <!-- Notes field (required for delay) -->
            <div class="form-group">
              <label for="updateNotes" class="form-label">Status Notes / Delay Reason</label>
              <input
                id="updateNotes"
                v-model="updateNotes"
                type="text"
                placeholder="e.g. Weather conditions delay, package sealed in bag"
                class="form-input"
              />
            </div>

            <!-- Optional bag association -->
            <div class="form-group">
              <label for="updateBag" class="form-label">Associate Bag (Optional)</label>
              <select id="updateBag" v-model="updateBagId" class="form-select">
                <option value="">No Bag Association</option>
                <option
                  v-for="bag in logisticsStore.bags"
                  :key="bag.id"
                  :value="bag.id"
                >
                  {{ bag.bagCode }} (Destination: {{ bag.destRegion?.regionCode }})
                </option>
              </select>
            </div>

            <div v-if="updateError" class="alert alert--danger">{{ updateError }}</div>
            <div v-if="updateSuccess" class="alert alert--success">{{ updateSuccess }}</div>

            <button type="submit" class="submit-btn" :disabled="updateSubmitting">
              <span v-if="updateSubmitting" class="spinner"></span>
              <span v-else>Apply Status Update</span>
            </button>
          </form>
        </div>

        <!-- History Timeline -->
        <div class="history-timeline-section">
          <h4 class="section-title">Audit Log / Status History</h4>
          <div class="timeline">
            <div v-if="selectedPackageHistory.length === 0" class="empty-timeline">
              No status logs available.
            </div>
            <div 
              v-else 
              v-for="log in selectedPackageHistory" 
              :key="log.id" 
              class="timeline-item"
            >
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <span :class="getStatusBadgeClass(log.status)">
                    {{ log.status.replace(/_/g, ' ') }}
                  </span>
                  <span class="timeline-time">{{ formatTime(log.createdAt) }}</span>
                </div>
                <div class="timeline-body">
                  <p v-if="log.notes" class="timeline-notes">“{{ log.notes }}”</p>
                  <p class="timeline-location text-muted">
                    📍 Located: {{ log.region?.regionName || 'Outside Hub' }}
                    <span v-if="log.bag">| Bag: {{ log.bag.bagCode }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Register Modal -->
    <div v-if="showRegisterModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="card-title">Register Package Manifest</h3>
          <button @click="showRegisterModal = false" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="handleRegisterPackage" class="modal-form">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Tracking ID *</label>
              <input v-model="trackingId" type="text" required placeholder="e.g. 518a27a8-12cd..." class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Weight (kg) *</label>
              <input v-model="weightKg" type="number" step="0.1" required class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Sender Name *</label>
              <input v-model="senderName" type="text" required class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Sender Address *</label>
              <input v-model="senderAddress" type="text" required class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Receiver Name *</label>
              <input v-model="receiverName" type="text" required class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Receiver Address *</label>
              <input v-model="receiverAddress" type="text" required class="form-input" />
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
              <label class="form-label">Destination Hub *</label>
              <select v-model="destRegionId" required class="form-select">
                <option value="">Select Destination</option>
                <option v-for="r in logisticsStore.regions" :key="r.id" :value="r.id">
                  {{ r.regionCode }} - {{ r.regionName }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Current Hub (Optional)</label>
              <select v-model="currentRegionId" class="form-select">
                <option value="">Same as Origin</option>
                <option v-for="r in logisticsStore.regions" :key="r.id" :value="r.id">
                  {{ r.regionCode }} - {{ r.regionName }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="registerError" class="alert alert--danger">{{ registerError }}</div>
          <div v-if="registerSuccess" class="alert alert--success">{{ registerSuccess }}</div>

          <div class="modal-footer">
            <button type="button" @click="showRegisterModal = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="registerSubmitting">
              <span v-if="registerSubmitting" class="spinner"></span>
              <span v-else>Register Manifest</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.packages-view {
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

.register-btn {
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

.register-btn:hover {
  background: #2563eb;
}

.ops-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

/* Timeline */
.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  position: relative;
  padding-left: var(--space-md);
  margin-top: var(--space-sm);
}

.timeline::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--color-border);
}

.timeline-item {
  position: relative;
  display: flex;
  gap: var(--space-md);
}

.timeline-dot {
  position: absolute;
  left: -14px;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 2px solid var(--color-bg-card);
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-time {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.timeline-notes {
  font-size: 0.8125rem;
  color: var(--color-text-primary);
  font-style: italic;
  margin-top: 2px;
}

.timeline-location {
  font-size: 0.75rem;
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
  max-width: 680px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-xs);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
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
