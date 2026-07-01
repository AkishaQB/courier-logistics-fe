<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useLogisticsStore } from '@/stores/logistics'

const logisticsStore = useLogisticsStore()

const regionCode = ref('')
const regionName = ref('')
const parentRegionId = ref('')

const localError = ref<string | null>(null)
const localSuccess = ref<string | null>(null)
const submitting = ref(false)

onMounted(async () => {
  await logisticsStore.fetchRegions()
})

async function handleCreateRegion() {
  localError.value = null
  localSuccess.value = null

  if (!regionCode.value || !regionName.value) {
    localError.value = 'Region Code and Region Name are required'
    return
  }

  submitting.value = true
  try {
    const payload: any = {
      regionCode: regionCode.value.toUpperCase().trim(),
      regionName: regionName.value.trim()
    }
    if (parentRegionId.value) {
      payload.parentRegionId = parentRegionId.value
    }

    await logisticsStore.createRegion(payload)
    localSuccess.value = `Region "${payload.regionCode}" created successfully!`
    regionCode.value = ''
    regionName.value = ''
    parentRegionId.value = ''
  } catch (err: any) {
    localError.value = err.response?.data?.error || 'Failed to create region'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="hubs-view">
    <div class="header-section">
      <div>
        <h1 class="page-title">Hub Management</h1>
        <p class="page-subtitle">Configure regional hubs, transit offices, and routing hierarchies</p>
      </div>
    </div>

    <div class="hubs-grid">
      <!-- Create region form -->
      <div class="card">
        <h3 class="card-title">Register New Hub</h3>
        <p class="card-subtitle">Add a new transit region or sub-hub to the network</p>

        <form @submit.prevent="handleCreateRegion" class="region-form">
          <div class="form-group">
            <label for="regionCode" class="form-label">Hub Code (e.g. TH-BKK)</label>
            <input
              id="regionCode"
              v-model="regionCode"
              type="text"
              required
              placeholder="TH-BKK"
              class="form-input"
              :disabled="submitting"
            />
          </div>

          <div class="form-group">
            <label for="regionName" class="form-label">Hub Name</label>
            <input
              id="regionName"
              v-model="regionName"
              type="text"
              required
              placeholder="Bangkok Transit Center"
              class="form-input"
              :disabled="submitting"
            />
          </div>

          <div class="form-group">
            <label for="parentRegion" class="form-label">Parent Hub (Optional)</label>
            <select
              id="parentRegion"
              v-model="parentRegionId"
              class="form-select"
              :disabled="submitting"
            >
              <option value="">No Parent (Root Hub)</option>
              <option
                v-for="reg in logisticsStore.regions"
                :key="reg.id"
                :value="reg.id"
              >
                {{ reg.regionCode }} - {{ reg.regionName }}
              </option>
            </select>
          </div>

          <div v-if="localError" class="alert alert--danger">
            {{ localError }}
          </div>
          <div v-if="localSuccess" class="alert alert--success">
            {{ localSuccess }}
          </div>

          <button type="submit" class="submit-btn" :disabled="submitting">
            <span v-if="submitting" class="spinner"></span>
            <span v-else>Register Hub</span>
          </button>
        </form>
      </div>

      <!-- Region network hierarchy list -->
      <div class="card col-2">
        <h3 class="card-title">Active Logistics Network</h3>
        <p class="card-subtitle">Existing regional hubs registered in the routing system</p>

        <div v-if="logisticsStore.loading && !logisticsStore.regions.length" class="empty-state">
          Loading regions...
        </div>
        <div v-else-if="logisticsStore.regions.length === 0" class="empty-state">
          No regions registered yet.
        </div>
        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Hub Code</th>
                <th>Hub Name</th>
                <th>Hierarchy Level</th>
                <th>Parent Hub</th>
                <th>Hub ID</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="reg in logisticsStore.regions" :key="reg.id">
                <td class="font-mono text-accent font-semibold">{{ reg.regionCode }}</td>
                <td>{{ reg.regionName }}</td>
                <td>
                  <span
                    class="level-badge"
                    :class="reg.parentRegionId ? 'level-badge--sub' : 'level-badge--root'"
                  >
                    {{ reg.parentRegionId ? 'Sub-Hub' : 'Root Hub' }}
                  </span>
                </td>
                <td>
                  <span v-if="reg.parentRegion" class="font-mono text-secondary">
                    {{ reg.parentRegion.regionCode }}
                  </span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="font-mono text-muted text-xs">{{ reg.id }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hubs-view {
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

.hubs-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-lg);
}

@media (max-width: 1024px) {
  .hubs-grid {
    grid-template-columns: 1fr;
  }
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

.region-form {
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
  transition: all var(--transition-fast);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-accent);
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
  margin-top: var(--space-sm);
  transition: all var(--transition-fast);
}

.submit-btn:hover:not(:disabled) {
  background: #2563eb;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Alert styles */
.alert {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  line-height: 1.4;
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

/* Level badge */
.level-badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.level-badge--root {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.level-badge--sub {
  background: var(--color-purple-soft);
  color: var(--color-purple);
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
