import axios from 'axios'
import router from '@/router'

const TOKEN_KEY = 'couriertrack_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request Interceptor: attach JWT & switch auth baseURL ─────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Use VITE_AUTH_API_BASE_URL only for auth requests if configured
  if (config.url?.startsWith('/api/auth') && import.meta.env.VITE_AUTH_API_BASE_URL) {
    config.baseURL = import.meta.env.VITE_AUTH_API_BASE_URL
  }

  return config
})

// ─── Response Interceptor: auto-logout on 401 ───────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = router.currentRoute.value.path
      if (path !== '/login') {
        localStorage.removeItem(TOKEN_KEY)
        router.push('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default api
export { TOKEN_KEY }
