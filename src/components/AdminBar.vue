<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { isAdmin, logout } from '../store/adminAuth'
import { theme, THEMES, setTheme } from '../store/themeStore'
import adminIcon from '../assets/GondorTree.jpg'
import SignInModal from './SignInModal.vue'

const rootRef = ref(null)
const panelOpen = ref(false)
const panelView = ref('main') // 'main' | 'themes'
const signInModalOpen = ref(false)

function togglePanel() {
  panelOpen.value = !panelOpen.value
  panelView.value = 'main'
}

function openSignIn() {
  panelOpen.value = false
  signInModalOpen.value = true
}

async function handleLogout() {
  await logout()
  panelOpen.value = false
}

function openThemeMenu() {
  panelView.value = 'themes'
}

function chooseTheme(id) {
  setTheme(id)
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
    <button
      type="button"
      class="admin-bar__trigger"
      title="Menu"
      @click="togglePanel"
    >
      <img :src="adminIcon" alt="Admin" />
    </button>

    <div v-if="panelOpen" class="admin-bar__panel">
      <div v-if="panelView === 'main'" class="admin-bar__actions">
        <button v-if="!isAdmin" type="button" class="admin-bar__item" @click="openSignIn">Sign In</button>
        <button v-else type="button" class="admin-bar__item admin-bar__signout" @click="handleLogout">Sign Out</button>
        <button type="button" class="admin-bar__item" @click="openThemeMenu">Themes</button>
      </div>

      <div v-else class="admin-bar__actions">
        <button type="button" class="admin-bar__back" @click="panelView = 'main'">← Back</button>
        <button
          v-for="t in THEMES"
          :key="t.id"
          type="button"
          class="admin-bar__item"
          :class="{ 'admin-bar__item--active': theme === t.id }"
          @click="chooseTheme(t.id)"
        >
          {{ t.name }}
        </button>
      </div>
    </div>

    <SignInModal v-if="signInModalOpen" @close="signInModalOpen = false" />
  </div>
</template>

<style scoped>
.admin-bar {
  position: relative;
}
.admin-bar__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 50%;
  width: 75px;
  height: 75px;
  /* A square image's corners stick out past a circular frame unless the
     circle's diameter comfortably exceeds the image's diagonal, hence the
     generous padding here rather than just sizing the image to fill the box. */
  padding: 10px;
  cursor: pointer;
}
.admin-bar__trigger img {
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  padding: 8px;
  width: 200px;
  z-index: 20;
}
.admin-bar__actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.admin-bar__item {
  border: none;
  background: none;
  color: #111827;
  padding: 8px 10px;
  text-align: left;
  font-size: 0.9rem;
  border-radius: 6px;
  cursor: pointer;
}
.admin-bar__item:hover {
  background: #f3f4f6;
}
.admin-bar__item--active {
  font-weight: 700;
  color: #2563eb;
}
.admin-bar__signout {
  color: #dc2626;
}
.admin-bar__back {
  border: none;
  background: none;
  color: #6b7280;
  padding: 6px 10px;
  text-align: left;
  font-size: 0.8rem;
  cursor: pointer;
}
.admin-bar__back:hover {
  color: #374151;
}
</style>
