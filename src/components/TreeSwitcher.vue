<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { isAdmin } from '../store/adminAuth'
import { trees, createTree } from '../store/treeStore'
import { theme } from '../store/themeStore'

const props = defineProps({
  currentTreeId: {
    type: String,
    required: true
  }
})

const router = useRouter()
const rootRef = ref(null)
const open = ref(false)
const creating = ref(false)

const currentName = computed(() => trees.find(t => t.id === props.currentTreeId)?.name || 'Family Tree')

function toggle() {
  open.value = !open.value
}

function goToTree(tree) {
  open.value = false
  if (tree.id === props.currentTreeId) return
  router.push({ name: 'tree', params: { slug: tree.id } })
}

async function handleCreate() {
  const name = window.prompt('Name for the new family tree:')
  if (!name || !name.trim()) return
  creating.value = true
  try {
    const id = await createTree(name)
    open.value = false
    if (id) router.push({ name: 'tree', params: { slug: id } })
  } catch (err) {
    window.alert(err.message || 'Something went wrong creating the family tree.')
    console.error(err)
  } finally {
    creating.value = false
  }
}

function handleClickOutside(event) {
  if (rootRef.value && !rootRef.value.contains(event.target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div class="tree-switcher" ref="rootRef">
    <button type="button" class="tree-switcher__trigger" @click="toggle">
      <span class="eyebrow" :class="{ 'eyebrow--minimal': theme === 'minimalist', 'eyebrow--midcentury': theme === 'midCenturyModern' }">{{ currentName }}</span>
      <span class="tree-switcher__caret" :class="{ open }">▾</span>
    </button>

    <div v-if="open" class="tree-switcher__panel" :class="{ 'tree-switcher__panel--minimal': theme === 'minimalist', 'tree-switcher__panel--midcentury': theme === 'midCenturyModern' }">
      <button
        v-for="tree in trees"
        :key="tree.id"
        type="button"
        class="tree-switcher__item"
        :class="{ active: tree.id === currentTreeId }"
        @click="goToTree(tree)"
      >
        {{ tree.name }}
      </button>

      <button
        v-if="isAdmin"
        type="button"
        class="tree-switcher__item tree-switcher__create"
        :disabled="creating"
        @click="handleCreate"
      >
        {{ creating ? 'Creating…' : '+ Create New Family Tree' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.tree-switcher {
  position: relative;
}
.tree-switcher__trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: brown;
  font-size: 1.4rem;
  font-family: 'Cinzel Decorative', fantasy, serif;
}
.eyebrow--minimal {
  color: #000;
  font-family: Arial, sans-serif;
}
.eyebrow--midcentury {
  color: #b1502c;
  font-family: 'Josefin Sans', sans-serif;
  letter-spacing: 0.1em;
}
.tree-switcher__caret {
  color: brown;
  font-size: 1rem;
  transition: transform 0.15s ease;
}
.tree-switcher__caret.open {
  transform: rotate(180deg);
}
.tree-switcher__panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
  padding: 6px;
  min-width: 220px;
  z-index: 25;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tree-switcher__item {
  border: none;
  background: transparent;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.9rem;
  font-family: 'Cinzel Decorative', fantasy, serif;
  text-align: left;
  cursor: pointer;
  color: #1f2937;
  white-space: nowrap;
}
.tree-switcher__item:hover {
  background: #f3f4f6;
}
.tree-switcher__item.active {
  font-weight: 700;
  color: #b45309;
}
.tree-switcher__panel--midcentury .tree-switcher__item {
  font-family: 'Josefin Sans', sans-serif;
}
.tree-switcher__panel--minimal .tree-switcher__item {
  font-family: Arial, sans-serif;
}
.tree-switcher__create {
  border-top: 1px solid #e5e7eb;
  margin-top: 4px;
  padding-top: 10px;
  color: #15803d;
  font-weight: 600;
}
.tree-switcher__create:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
