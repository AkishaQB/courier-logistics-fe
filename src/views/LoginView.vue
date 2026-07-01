<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const localError = ref<string | null>(null)

async function handleLogin() {
  localError.value = null
  if (!email.value || !password.value) {
    localError.value = 'Please enter your email and password'
    return
  }

  const success = await authStore.login(email.value, password.value)
  if (success) {
    router.push({ name: 'dashboard' })
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <span class="login-logo">🚚</span>
        <h1 class="login-title">Courier Logistics</h1>
        <p class="login-subtitle">Logistics & Operations Control Center</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email" class="form-label">Work Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="operator@couriertrack.com"
            class="form-input"
            :disabled="authStore.loading"
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Operations Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="form-input"
            :disabled="authStore.loading"
          />
        </div>

        <div v-if="localError || authStore.error" class="error-banner">
          {{ localError || authStore.error }}
        </div>

        <button
          type="submit"
          class="login-button"
          :disabled="authStore.loading"
        >
          <span v-if="authStore.loading" class="spinner"></span>
          <span v-else>Authenticate Session</span>
        </button>
      </form>

      <div class="login-footer">
        <p>Restricted access for logistics operators and administration personnel only.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-md);
  background: radial-gradient(circle at center, #111827 0%, #030712 100%);
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: var(--space-2xl) var(--space-xl);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(8px);
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.login-logo {
  display: inline-block;
  font-size: 3rem;
  margin-bottom: var(--space-sm);
  filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.4));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.login-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-xs);
  background: linear-gradient(135deg, var(--color-text-primary) 30%, #9ca3af 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
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
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.9375rem;
  transition: all var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.error-banner {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  background: var(--color-danger-soft);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--color-danger);
  font-size: 0.875rem;
  line-height: 1.4;
}

.login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.875rem;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  border: none;
  color: white;
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.login-button:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  text-align: center;
  margin-top: var(--space-xl);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.login-footer p {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
