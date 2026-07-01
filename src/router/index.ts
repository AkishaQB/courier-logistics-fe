import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/hubs',
      name: 'hubs',
      component: () => import('@/views/HubsView.vue')
    },
    {
      path: '/packages',
      name: 'packages',
      component: () => import('@/views/PackagesView.vue')
    },
    {
      path: '/bags',
      name: 'bags',
      component: () => import('@/views/BagsView.vue')
    },
    {
      path: '/trucks',
      name: 'trucks',
      component: () => import('@/views/TrucksView.vue')
    },
    {
      path: '/schedules',
      name: 'schedules',
      component: () => import('@/views/SchedulesView.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
})

// ─── Global Navigation Guard ─────────────────────────────
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Attempt to restore user session if token exists but user info isn't loaded
  if (authStore.token && !authStore.user) {
    await authStore.fetchMe()
  }

  const isPublic = to.meta.public === true

  if (!isPublic && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
