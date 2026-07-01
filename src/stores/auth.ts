import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api, { TOKEN_KEY } from '@/services/api'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isLogisticsOrAdmin = computed(() => {
    return user.value?.role === 'logistics' || user.value?.role === 'admin'
  })

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post<{ token: string; user: User }>('/api/auth/login', {
        email,
        password,
      })
      
      // Ensure role is logistics or admin
      if (data.user.role !== 'logistics' && data.user.role !== 'admin') {
        error.value = 'Access denied. Only logistics staff and admins can access this dashboard.'
        return false
      }

      user.value = data.user
      token.value = data.token
      localStorage.setItem(TOKEN_KEY, data.token)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error || err.response?.data?.message || 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchMe(): Promise<boolean> {
    if (!token.value) return false
    loading.value = true
    try {
      const { data } = await api.get<User>('/api/auth/me')
      if (data.role !== 'logistics' && data.role !== 'admin') {
        logout()
        return false
      }
      user.value = data
      return true
    } catch (err) {
      logout()
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isLogisticsOrAdmin,
    login,
    fetchMe,
    logout,
  }
})
