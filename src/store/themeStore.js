import { ref, watch } from 'vue'

const STORAGE_KEY = 'family-tree-theme'

export const THEMES = [
  { id: 'middleEarth', name: 'Middle Earth' },
  { id: 'minimalist', name: 'Minimalist' },
  { id: 'midCenturyModern', name: 'Mid Century Modern' }
]

const stored = localStorage.getItem(STORAGE_KEY)
export const theme = ref(THEMES.some(t => t.id === stored) ? stored : 'middleEarth')

export function setTheme(id) {
  theme.value = id
  localStorage.setItem(STORAGE_KEY, id)
}

watch(theme, (value) => {
  localStorage.setItem(STORAGE_KEY, value)
})
