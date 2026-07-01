<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLogisticsStore } from '@/stores/logistics'

const authStore = useAuthStore()
const logisticsStore = useLogisticsStore()
const route = useRoute()

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await authStore.fetchMe()
    await logisticsStore.fetchRegions()
    await logisticsStore.fetchDashboard()
  }
})

watch(
  () => authStore.isAuthenticated,
  async (newVal) => {
    if (newVal) {
      await logisticsStore.fetchRegions()
      await logisticsStore.fetchDashboard()
    }
  }
)

async function handleRegionChange() {
  await Promise.all([
    logisticsStore.fetchDashboard(),
    logisticsStore.fetchPackages(),
    logisticsStore.fetchBags(),
    logisticsStore.fetchTrucks(),
    logisticsStore.fetchSchedules(),
  ])
}

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <div v-if="authStore.isAuthenticated && route.name !== 'login'" class="app-layout">
    <nav class="app-nav">
      <div class="app-nav__brand">
        <span class="app-nav__brand-icon">📦</span>
        <span>Logistics HQ</span>
      </div>

      <div class="app-nav__links">
        <RouterLink :to="{ name: 'dashboard' }" class="app-nav__link">
          📊 Dashboard
        </RouterLink>
        <RouterLink :to="{ name: 'hubs' }" class="app-nav__link">
          🏢 Hubs
        </RouterLink>
        <RouterLink :to="{ name: 'packages' }" class="app-nav__link">
          📦 Packages
        </RouterLink>
        <RouterLink :to="{ name: 'bags' }" class="app-nav__link">
          👜 Bags
        </RouterLink>
        <RouterLink :to="{ name: 'trucks' }" class="app-nav__link">
          🚛 Trucks
        </RouterLink>
        <RouterLink :to="{ name: 'schedules' }" class="app-nav__link">
          📅 Schedules
        </RouterLink>
      </div>

      <div class="app-nav__user">
        <div class="region-selector-wrapper">
          <label for="global-region" class="selector-label">Active Hub:</label>
          <select
            id="global-region"
            v-model="logisticsStore.activeRegionId"
            @change="handleRegionChange"
            class="region-select"
          >
            <option value="">All Regions</option>
            <option
              v-for="region in logisticsStore.regions"
              :key="region.id"
              :value="region.id"
            >
              {{ region.regionCode }} - {{ region.regionName }}
            </option>
          </select>
        </div>

        <div class="user-meta">
          <span class="app-nav__user-name">{{ authStore.user?.email }}</span>
          <span class="user-role">{{ authStore.user?.role }}</span>
        </div>
        
        <button @click="handleLogout" class="app-nav__logout">
          Logout
        </button>
      </div>
    </nav>

    <main class="app-main">
      <RouterView />
    </main>
  </div>

  <div v-else>
    <RouterView />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.region-selector-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--color-bg-card);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.selector-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.region-select {
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
}

.region-select option {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
}

.user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.user-role {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-accent);
  letter-spacing: 0.05em;
  line-height: 1;
  margin-top: 2px;
}
</style>
