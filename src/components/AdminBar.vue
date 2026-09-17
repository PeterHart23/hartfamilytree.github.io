<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { isAdmin, login, logout } from '../store/adminAuth'

defineProps({
  hasSelection: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['action'])

const rootRef = ref(null)
const panelOpen = ref(false)
const username = ref('')
const password = ref('')
const error = ref('')

function togglePanel() {
  panelOpen.value = !panelOpen.value
  error.value = ''
}

function handleLogin() {
  if (login(username.value, password.value)) {
    error.value = ''
    username.value = ''
    password.value = ''
  } else {
    error.value = 'Invalid username or password.'
  }
}

function handleLogout() {
  logout()
  panelOpen.value = false
}

function emitAction(action) {
  emit('action', action)
  panelOpen.value = false
}

function handleClickOutside(event) {
  if (rootRef.value && !rootRef.value.contains(event.target)) {
    panelOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div class="admin-bar" ref="rootRef">
    <button type="button" class="admin-bar__trigger" @click="togglePanel">
      {{ isAdmin ? 'Admin' : 'Admin Sign In' }}
    </button>

    <div v-if="panelOpen" class="admin-bar__panel">
      <form v-if="!isAdmin" class="admin-bar__login" @submit.prevent="handleLogin">
        <label>
          Username
          <input v-model="username" type="text" autocomplete="username" />
        </label>
        <label>
          Password
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <p v-if="error" class="admin-bar__error">{{ error }}</p>
        <button type="submit">Sign In</button>
      </form>

      <div v-else class="admin-bar__actions">
        <p v-if="!hasSelection" class="admin-bar__hint">Select a card to enable actions.</p>
        <button type="button" :disabled="!hasSelection" @click="emitAction('edit-person')">Edit Person</button>
        <button type="button" :disabled="!hasSelection" @click="emitAction('add-parents')">Add Parents</button>
        <button type="button" :disabled="!hasSelection" @click="emitAction('add-sibling')">Add Sibling</button>
        <button type="button" :disabled="!hasSelection" @click="emitAction('add-partner')">Add Partner</button>
        <button type="button" :disabled="!hasSelection" @click="emitAction('add-child')">Add Child</button>
        <hr />
        <button type="button" class="admin-bar__link" @click="emitAction('export')">Export changes…</button>
        <button type="button" class="admin-bar__link admin-bar__signout" @click="handleLogout">Sign Out</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-bar {
  position: relative;
}
.admin-bar__trigger {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
}
.admin-bar__trigger:hover {
  border-color: #9ca3af;
}
.admin-bar__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
  padding: 16px;
  width: 220px;
  z-index: 20;
}
.admin-bar__login {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.admin-bar__login label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #374151;
}
.admin-bar__login input {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.9rem;
}
.admin-bar__login button[type='submit'] {
  margin-top: 4px;
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
  padding: 8px;
  font-weight: 600;
  cursor: pointer;
}
.admin-bar__error {
  color: #dc2626;
  font-size: 0.8rem;
  margin: 0;
}
.admin-bar__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.admin-bar__actions button {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
}
.admin-bar__actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.admin-bar__hint {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0 0 2px;
}
.admin-bar__actions hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 4px 0;
}
.admin-bar__link {
  border: none !important;
  background: none !important;
  color: #2563eb;
  padding: 4px 2px !important;
}
.admin-bar__signout {
  color: #dc2626;
}
</style>
