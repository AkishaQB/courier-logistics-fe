<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useLogisticsStore } from '@/stores/logistics'
import type { Package } from '@/types'

const logisticsStore = useLogisticsStore()

// State for active drill-down section
const activeSection = ref<'none' | 'new-arrivals' | 'truck-arrivals' | 'loaded' | 'delayed'>('none')

onMounted(async () => {
  await logisticsStore.fetchDashboard()
})

const activeSectionTitle = computed(() => {
  switch (activeSection.value) {
    case 'new-arrivals': return 'New Arrivals (Awaiting Bagging)'
    case 'truck-arrivals': return 'Hub Arrivals (Awaiting Re-bagging)'
    case 'loaded': return 'Loaded Packages (In Transit)'
    case 'delayed': return 'Delayed Packages'
    default: return ''
  }
})

const activeSectionData = computed(() => {
  switch (activeSection.value) {
    case 'new-arrivals': return logisticsStore.newArrivals
    case 'truck-arrivals': return logisticsStore.truckArrivals
    case 'loaded': return logisticsStore.loadedPackages
    case 'delayed': return logisticsStore.delayedPackages
    default: return []
  }
})

function selectCard(section: 'new-arrivals' | 'truck-arrivals' | 'loaded' | 'delayed') {
  if (activeSection.value === section) {
    activeSection.value = 'none'
  } else {
    activeSection.value = section
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
  <div class="dashboard-view">
    <div class="header-section">
      <div>
        <h1 class="page-title">Operations Dashboard</h1>
        <p class="page-subtitle">Real-time status overview of the logistics network</p>
      </div>
      <button @click="logisticsStore.fetchDashboard" class="refresh-button" :disabled="logisticsStore.loading">
        🔄 Refresh Network
      </button>
    </div>

    <!-- Summary cards -->
    <div class="stats-grid">
      <div 
        @click="selectCard('new-arrivals')" 
        class="stat-card"
        :class="{ active: activeSection === 'new-arrivals' }"
      >
        <div class="stat-card__icon text-accent">📥</div>
        <div class="stat-card__content">
          <span class="stat-card__label">New Arrivals</span>
          <h2 class="stat-card__value">{{ (logisticsStore.dashboardData?.summary?.packages?.byStatus?.to_be_picked_up ?? 0) + (logisticsStore.dashboardData?.summary?.packages?.byStatus?.picked_up ?? 0) }}</h2>
          <p class="stat-card__desc">Awaiting bagging & sorting</p>
        </div>
      </div>

      <div 
        @click="selectCard('truck-arrivals')" 
        class="stat-card"
        :class="{ active: activeSection === 'truck-arrivals' }"
      >
        <div class="stat-card__icon text-info">🏢</div>
        <div class="stat-card__content">
          <span class="stat-card__label">Hub Arrivals</span>
          <h2 class="stat-card__value">{{ logisticsStore.dashboardData?.summary?.packages?.byStatus?.arrived || 0 }}</h2>
          <p class="stat-card__desc">Unloaded, waiting transfer</p>
        </div>
      </div>

      <div 
        @click="selectCard('loaded')" 
        class="stat-card"
        :class="{ active: activeSection === 'loaded' }"
      >
        <div class="stat-card__icon text-success">🚚</div>
        <div class="stat-card__content">
          <span class="stat-card__label">Loaded / In Transit</span>
          <h2 class="stat-card__value">{{ (logisticsStore.dashboardData?.summary?.packages?.byStatus?.in_transit ?? 0) + (logisticsStore.dashboardData?.summary?.packages?.byStatus?.added_to_bag ?? 0) }}</h2>
          <p class="stat-card__desc">Bagged and loaded on trucks</p>
        </div>
      </div>

      <div 
        @click="selectCard('delayed')" 
        class="stat-card"
        :class="{ active: activeSection === 'delayed' }"
      >
        <div class="stat-card__icon text-danger">⚠️</div>
        <div class="stat-card__content">
          <span class="stat-card__label">Delayed</span>
          <h2 class="stat-card__value">{{ logisticsStore.dashboardData?.summary?.packages?.byStatus?.delayed || 0 }}</h2>
          <p class="stat-card__desc">Flagged with delay reasons</p>
        </div>
      </div>
    </div>

    <!-- Drill-down section -->
    <div v-if="activeSection !== 'none'" class="drilldown-panel card animate-slide-down">
      <div class="drilldown-header">
        <h3 class="card-title">{{ activeSectionTitle }}</h3>
        <button @click="activeSection = 'none'" class="close-btn">✕ Close</button>
      </div>

      <div v-if="activeSectionData.length === 0" class="empty-state">
        No packages found in this category.
      </div>
      <div v-else class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Sender</th>
              <th>Destination</th>
              <th>Current Hub</th>
              <th>Weight</th>
              <th v-if="activeSection === 'delayed'">Delay Reason</th>
              <th>Status</th>
              <th>Registered At</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pkg in activeSectionData" :key="pkg.id">
              <td class="font-mono text-accent">{{ pkg.trackingId }}</td>
              <td>{{ pkg.senderName }}</td>
              <td>{{ pkg.destRegion?.regionName || 'Unknown' }}</td>
              <td>{{ pkg.currentRegion?.regionCode || 'Outside Network' }}</td>
              <td>{{ pkg.weightKg }} kg</td>
              <td v-if="activeSection === 'delayed'" class="text-danger font-semibold">
                {{ pkg.delayReason || pkg.statusHistory?.[0]?.notes || 'No reason specified' }}
              </td>
              <td>
                <span :class="getStatusBadgeClass(pkg.currentStatus)">
                  {{ pkg.currentStatus.replace(/_/g, ' ') }}
                </span>
              </td>
              <td>{{ formatTime(pkg.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Recent packages processed -->
      <div class="card col-2">
        <h3 class="card-title">Recent Activity</h3>
        <p class="card-subtitle">Latest package updates across selected hub</p>

        <div v-if="!logisticsStore.dashboardData?.recentPackages?.length" class="empty-state">
          No recent activity reported.
        </div>
        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tracking ID</th>
                <th>Sender</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>Processed At</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pkg in logisticsStore.dashboardData.recentPackages" :key="pkg.id">
                <td class="font-mono text-accent">{{ pkg.trackingId }}</td>
                <td>{{ pkg.senderName }}</td>
                <td>{{ pkg.receiverName }}</td>
                <td>
                  <span :class="getStatusBadgeClass(pkg.currentStatus)">
                    {{ pkg.currentStatus.replace(/_/g, ' ') }}
                  </span>
                </td>
                <td>{{ formatTime(pkg.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Active Schedules -->
      <div class="card">
        <h3 class="card-title">Active Schedule Departures</h3>
        <p class="card-subtitle">Upcoming linehaul schedules departing soon</p>

        <div v-if="!logisticsStore.dashboardData?.activeSchedules?.length" class="empty-state">
          No schedules waiting departure.
        </div>
        <div v-else class="schedule-list">
          <div v-for="sched in logisticsStore.dashboardData.activeSchedules" :key="sched.id" class="schedule-item">
            <div class="schedule-header">
              <span class="truck-code">🚛 {{ sched.truck?.truckCode }}</span>
              <span class="bag-count">{{ sched._count?.truckBags || 0 }} Bags loaded</span>
            </div>
            <div class="route-desc">{{ sched.routeDescription }}</div>
            <div class="schedule-footer">
              <span class="time">Dep: {{ formatTime(sched.scheduledDeparture) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Regional Summary -->
      <div class="card">
        <h3 class="card-title">Hub Capacity Overview</h3>
        <p class="card-subtitle">Overview of packages and fleet distribution by region</p>

        <div v-if="!logisticsStore.dashboardData?.regionSummary?.length" class="empty-state">
          No region summary metrics available.
        </div>
        <div v-else class="region-summary-list">
          <div v-for="reg in logisticsStore.dashboardData.regionSummary" :key="reg.regionCode" class="region-summary-item">
            <div class="region-details">
              <span class="region-code">{{ reg.regionCode }}</span>
              <span class="region-name">{{ reg.regionName }}</span>
            </div>
            <div class="region-stats">
              <span class="stat-badge bg-accent-soft text-accent" title="Packages in Hub">
                📦 {{ reg._count?.currentPackages || 0 }}
              </span>
              <span class="stat-badge bg-info-soft text-info" title="Fleet in Hub">
                🚛 {{ reg._count?.trucks || 0 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
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

.refresh-button {
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.refresh-button:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

/* Stats Cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-md);
}

.stat-card {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.stat-card:hover {
  border-color: var(--color-border-hover);
  transform: translateY(-2px);
  background: var(--color-bg-card-hover);
}

.stat-card.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 12px var(--color-accent-soft);
}

.stat-card__icon {
  font-size: 2.25rem;
  display: flex;
  align-items: center;
}

.stat-card__content {
  display: flex;
  flex-direction: column;
}

.stat-card__label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  letter-spacing: 0.05em;
}

.stat-card__value {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 2px 0;
}

.stat-card__desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Drilldown Panel */
.drilldown-panel {
  border-color: var(--color-accent);
}

.drilldown-header {
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
  transition: all var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-text-muted);
}

/* Dashboard Grid Layout */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-lg);
}

.col-2 {
  grid-column: span 2;
}

@media (max-width: 1024px) {
  .col-2 {
    grid-column: span 1;
  }
}

/* Card Styling */
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

/* Data Table */
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

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge--to-be-picked-up { background: var(--color-warning-soft); color: var(--color-warning); }
.badge--picked-up { background: var(--color-cyan-soft); color: var(--color-cyan); }
.badge--added-to-bag { background: var(--color-purple-soft); color: var(--color-purple); }
.badge--in-transit { background: var(--color-info-soft); color: var(--color-info); }
.badge--arrived { background: var(--color-accent-soft); color: var(--color-accent); }
.badge--scheduled-for-delivery { background: var(--color-purple-soft); color: var(--color-purple); }
.badge--out-for-delivery { background: var(--color-cyan-soft); color: var(--color-cyan); }
.badge--delivered { background: var(--color-success-soft); color: var(--color-success); }
.badge--delayed { background: var(--color-danger-soft); color: var(--color-danger); }

/* Schedule items */
.schedule-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.schedule-item {
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-xs);
}

.truck-code {
  font-weight: 700;
  color: var(--color-text-primary);
}

.bag-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
}

.route-desc {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.schedule-footer {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Region summary list */
.region-summary-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.region-summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.region-details {
  display: flex;
  flex-direction: column;
}

.region-code {
  font-weight: 700;
  font-size: 0.875rem;
}

.region-name {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.region-stats {
  display: flex;
  gap: var(--space-xs);
}

.stat-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.bg-accent-soft { background: var(--color-accent-soft); }
.bg-info-soft { background: var(--color-info-soft); }

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
}

.font-mono { font-family: monospace; }
.font-semibold { font-weight: 600; }
.text-accent { color: var(--color-accent); }
.text-info { color: var(--color-info); }
.text-success { color: var(--color-success); }
.text-danger { color: var(--color-danger); }

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
