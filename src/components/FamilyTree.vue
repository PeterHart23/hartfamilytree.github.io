<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import PersonCard from './PersonCard.vue'
import FamilyGroup from './FamilyGroup.vue'
import AdminBar from './AdminBar.vue'
import PersonFormModal from './PersonFormModal.vue'
import { members as familyMembers, updatePerson, addPartner, addSibling, addChild, addParents, exportMembersJson } from '../store/familyStore'

const selectedId = ref(familyMembers[0]?.id || null)
const sidebarOpen = ref(true)

const membersById = computed(() => {
  return familyMembers.reduce((map, member) => {
    map[member.id] = member
    return map
  }, {})
})

const childrenMap = computed(() => {
  return familyMembers.reduce((map, member) => {
    member.parentIds.forEach(parentId => {
      if (!map[parentId]) {
        map[parentId] = []
      }
      map[parentId].push(member)
    })
    return map
  }, {})
})

const rootMembers = computed(() => {
  return familyMembers.filter(member => {
    if (member.parentIds.length > 0) return false
    const spouse = membersById.value[member.spouseId]
    return !spouse || spouse.parentIds.length === 0
  })
})

const birthTimestamp = member => {
  const date = new Date(member?.birth)
  return Number.isFinite(date.getTime()) ? date.getTime() : 0
}

// Build a proper tree: each node represents a couple/single with their own
// children nested beneath them, so nobody is ever rendered more than once.
function buildGroups(memberIds) {
  const groups = []
  const processed = new Set()

  memberIds.forEach(id => {
    if (processed.has(id)) return
    const member = membersById.value[id]
    if (!member) return

    const spouse = membersById.value[member.spouseId]
    let parents
    let coupleIds

    if (spouse) {
      parents = member.id < spouse.id ? [member, spouse] : [spouse, member]
      coupleIds = [member.id, spouse.id]
    } else {
      parents = [member]
      coupleIds = [member.id]
    }

    coupleIds.forEach(cid => processed.add(cid))

    const childMembers = (childrenMap.value[member.id] || [])
      .slice()
      .sort((a, b) => birthTimestamp(a) - birthTimestamp(b))
    const childIds = childMembers.map(child => child.id)
    const childGroups = childIds.length ? buildGroups(childIds) : []

    groups.push({
      key: coupleIds.slice().sort().join('::'),
      parents,
      childGroups
    })
  })

  return groups
}

const familyTree = computed(() => buildGroups(rootMembers.value.map(m => m.id)))

const selectedPerson = computed(() => membersById.value[selectedId.value] || familyMembers[0])
const selectedParents = computed(() => selectedPerson.value.parentIds.map(id => membersById.value[id]).filter(Boolean))
const selectedChildren = computed(() => childrenMap.value[selectedPerson.value.id] || [])
const selectedSpouse = computed(() => membersById.value[selectedPerson.value.spouseId] || null)

function selectPerson(person) {
  if (selectedId.value === person.id) {
    sidebarOpen.value = !sidebarOpen.value
  } else {
    selectedId.value = person.id
    sidebarOpen.value = true
  }
}

function closePerson() {
  sidebarOpen.value = false
}

const activeModal = ref(null)
const showExport = ref(false)
const exportCopied = ref(false)

function handleAdminAction(action) {
  if (action === 'export') {
    showExport.value = true
    return
  }
  if (!selectedId.value) return
  activeModal.value = action
}

function closeModal() {
  activeModal.value = null
}

function handleModalSubmit(payload) {
  const personId = selectedPerson.value.id
  switch (activeModal.value) {
    case 'edit-person':
      updatePerson(personId, payload.data)
      break
    case 'add-partner':
      addPartner(personId, payload.data)
      break
    case 'add-sibling':
      addSibling(personId, payload.data)
      break
    case 'add-child':
      addChild(personId, payload.data, { includeSpouse: payload.includeSpouse })
      break
    case 'add-parents':
      addParents(personId, payload.parents)
      break
  }
  activeModal.value = null
}

async function copyExport() {
  try {
    await navigator.clipboard.writeText(exportMembersJson())
    exportCopied.value = true
    setTimeout(() => (exportCopied.value = false), 2000)
  } catch (err) {
    console.warn('Copy to clipboard failed.', err)
  }
}

function closeExport() {
  showExport.value = false
  exportCopied.value = false
}

const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const MIN_ZOOM = 0.4
const MAX_ZOOM = 2

function zoomIn() {
  zoom.value = Math.min(MAX_ZOOM, +(zoom.value + 0.1).toFixed(2))
}

function zoomOut() {
  zoom.value = Math.max(MIN_ZOOM, +(zoom.value - 0.1).toFixed(2))
}

function resetZoom() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

// Keep the point under the cursor fixed on screen while zooming: work out
// which "content" coordinate (in unscaled local units) is currently under
// the cursor, then after the zoom level changes, adjust the pan offset so
// that same content coordinate lands back under the cursor. This is done
// with explicit pan state rather than native scrollLeft/scrollTop because
// the container may not be scrollable at all zoom levels (e.g. when the
// content is smaller than the viewport while zoomed out).
function zoomAtPoint(cursorX, cursorY, direction) {
  const oldZoom = zoom.value
  const contentX = (cursorX - panX.value) / oldZoom
  const contentY = (cursorY - panY.value) / oldZoom

  if (direction < 0) {
    zoomIn()
  } else {
    zoomOut()
  }

  const newZoom = zoom.value
  panX.value = cursorX - contentX * newZoom
  panY.value = cursorY - contentY * newZoom
}

function handleWheelZoom(event) {
  event.preventDefault()
  const container = chartRef.value
  if (!container) {
    if (event.deltaY < 0) zoomIn()
    else zoomOut()
    return
  }

  const rect = container.getBoundingClientRect()
  const cursorX = event.clientX - rect.left
  const cursorY = event.clientY - rect.top
  zoomAtPoint(cursorX, cursorY, event.deltaY)
}

// Click-and-drag panning of the chart. A small movement threshold keeps
// plain clicks on person cards working as selections rather than drags.
const isPanning = ref(false)
const dragMoved = ref(false)
const DRAG_THRESHOLD = 4
const dragStart = { x: 0, y: 0 }
const panOrigin = { x: 0, y: 0 }
let activePointerId = null

function onChartPointerDown(event) {
  if (event.button !== 0) return
  isPanning.value = true
  dragMoved.value = false
  activePointerId = event.pointerId
  dragStart.x = event.clientX
  dragStart.y = event.clientY
  panOrigin.x = panX.value
  panOrigin.y = panY.value
  event.currentTarget.setPointerCapture(event.pointerId)
}

function onChartPointerMove(event) {
  if (!isPanning.value) return
  const dx = event.clientX - dragStart.x
  const dy = event.clientY - dragStart.y
  if (!dragMoved.value && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    dragMoved.value = true
  }
  panX.value = panOrigin.x + dx
  panY.value = panOrigin.y + dy
}

function onChartPointerUp(event) {
  if (!isPanning.value) return
  isPanning.value = false
  if (activePointerId !== null && event.currentTarget.hasPointerCapture?.(activePointerId)) {
    event.currentTarget.releasePointerCapture(activePointerId)
  }
  activePointerId = null
}

// Suppress the click that follows a drag so it doesn't select a person.
function onChartClickCapture(event) {
  if (dragMoved.value) {
    event.stopPropagation()
    event.preventDefault()
    dragMoved.value = false
  }
}

const chartRef = ref(null)
const zoomLayerRef = ref(null)
const connections = ref([])

function computeConnections() {
  const container = zoomLayerRef.value
  if (!container) return
  // Measure relative to the scaled zoom-layer itself (not the outer padded
  // chart wrapper). Since transform-origin is top-left, the zoom-layer's own
  // top-left corner never moves, so dividing by scale here correctly
  // converts screen pixels back into the zoom-layer's unscaled local
  // coordinate space, which is what the SVG polylines are drawn in.
  const containerRect = container.getBoundingClientRect()
  const scale = zoom.value || 1
  const nodes = Array.from(container.querySelectorAll('.family-node'))
  const byId = {}
  nodes.forEach(n => {
    const id = n.getAttribute('data-id')
    const r = n.getBoundingClientRect()
    byId[id] = {
      left: (r.left - containerRect.left) / scale,
      right: (r.right - containerRect.left) / scale,
      top: (r.top - containerRect.top) / scale,
      bottom: (r.bottom - containerRect.top) / scale,
      width: r.width / scale,
      height: r.height / scale,
      cx: (r.left + r.width / 2 - containerRect.left) / scale,
      cy: (r.top + r.height / 2 - containerRect.top) / scale
    }
  })

  const paths = []
  const processedCouples = new Set()
  const processedSingles = new Set()

  // Spouse connections (horizontal)
  familyMembers.forEach(m => {
    const sid = m.spouseId
    if (sid && byId[m.id] && byId[sid]) {
      const a = byId[m.id]
      const b = byId[sid]
      if (m.id < sid) {
        // Use average Y for perfectly horizontal line
        const avgY = (a.cy + b.cy) / 2
        if (a.cx <= b.cx) {
          paths.push({ points: [[a.right, avgY], [b.left, avgY]], type: 'spouse', id: m.id + '::' + sid })
        } else {
          paths.push({ points: [[a.left, avgY], [b.right, avgY]], type: 'spouse', id: m.id + '::' + sid })
        }
      }
    }
  })

  // Group all children by their parents
  const childrenByCouple = {}
  const childrenBySingle = {}

  familyMembers.forEach(child => {
    if (!child.parentIds || !child.parentIds.length) return
    
    if (child.parentIds.length === 2) {
      const parentKey = [...child.parentIds].sort().join('::')
      if (!childrenByCouple[parentKey]) {
        childrenByCouple[parentKey] = []
      }
      childrenByCouple[parentKey].push(child)
    } else if (child.parentIds.length === 1) {
      const parentId = child.parentIds[0]
      if (!childrenBySingle[parentId]) {
        childrenBySingle[parentId] = []
      }
      childrenBySingle[parentId].push(child)
    }
  })

  // Process couples with children
  Object.entries(childrenByCouple).forEach(([coupleKey, coupleChildren]) => {
    const parentIds = coupleKey.split('::')
    const p0 = byId[parentIds[0]]
    const p1 = byId[parentIds[1]]
    
    if (!p0 || !p1) return

    const midX = (p0.cx + p1.cx) / 2
    const avgY = (p0.cy + p1.cy) / 2
    const maxBottomY = Math.max(p0.bottom, p1.bottom)
    const trunkBottomY = maxBottomY + 20

    // Single trunk line from spouse line down
    paths.push({
      points: [
        [midX, avgY],
        [midX, trunkBottomY]
      ],
      type: 'parent',
      id: 'trunk::' + coupleKey
    })

    // Connection from trunk to each child
    coupleChildren.forEach(child => {
      const childPos = byId[child.id]
      if (!childPos) return

      const midY = (trunkBottomY + childPos.top) / 2
      paths.push({
        points: [
          [midX, trunkBottomY],
          [midX, midY],
          [childPos.cx, midY],
          [childPos.cx, childPos.top]
        ],
        type: 'parent',
        id: coupleKey + '->' + child.id
      })
    })
  })

  // Process single parents with children
  Object.entries(childrenBySingle).forEach(([parentId, singleChildren]) => {
    // Skip if this parent is also in a couple (they should be handled above)
    const parent = familyMembers.find(m => m.id === parentId)
    if (parent && parent.spouseId && familyMembers.some(m => m.id === parent.spouseId)) {
      return
    }

    const p = byId[parentId]
    if (!p) return

    singleChildren.forEach(child => {
      const childPos = byId[child.id]
      if (!childPos) return

      const midY = (p.bottom + childPos.top) / 2
      paths.push({
        points: [
          [p.cx, p.bottom],
          [p.cx, midY],
          [childPos.cx, midY],
          [childPos.cx, childPos.top]
        ],
        type: 'parent',
        id: parentId + '->' + child.id
      })
    })
  })

  connections.value = paths
}

let resizeObserver
onMounted(() => {
  nextTick(() => computeConnections())
  window.addEventListener('resize', computeConnections)
  resizeObserver = new ResizeObserver(() => computeConnections())
  if (chartRef.value) resizeObserver.observe(chartRef.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', computeConnections)
  if (resizeObserver && chartRef.value) resizeObserver.unobserve(chartRef.value)
})

watch([familyTree, selectedId], () => {
  nextTick(() => computeConnections())
})

watch(zoom, () => {
  nextTick(() => computeConnections())
})
</script>

<template>
  <div class="family-tree-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Hart Family Tree</p>
      </div>
      <AdminBar :has-selection="!!selectedId" @action="handleAdminAction" />
    </header>

    <div class="family-layout">
      <section class="family-map">
        <div class="family-map__header">
          <h2>Family generations</h2>
          <p>Click a person to view details for the selected member.</p>
          <div class="zoom-controls">
            <button type="button" @click="zoomOut" :disabled="zoom <= MIN_ZOOM">−</button>
            <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
            <button type="button" @click="zoomIn" :disabled="zoom >= MAX_ZOOM">+</button>
            <button type="button" class="zoom-reset" @click="resetZoom">Reset</button>
          </div>
        </div>

        <div
          class="family-map__chart"
          ref="chartRef"
          :class="{ 'is-panning': isPanning }"
          @wheel="handleWheelZoom"
          @pointerdown="onChartPointerDown"
          @pointermove="onChartPointerMove"
          @pointerup="onChartPointerUp"
          @pointercancel="onChartPointerUp"
          @click.capture="onChartClickCapture"
        >
          <div class="family-map__zoom-layer" ref="zoomLayerRef" :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }">
          <svg class="family-connections" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <g>
              <polyline
                v-for="path in connections"
                :key="path.id"
                :points="path.points.map(p => p.join(',')).join(' ')"
                :class="['connection', path.type]"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </g>
          </svg>

          <div class="tree-root">
            <FamilyGroup
              v-for="group in familyTree"
              :key="group.key"
              :group="group"
              :selected-id="selectedId"
              @select="selectPerson"
            />
          </div>
          </div>
        </div>
      </section>

      <aside class="family-sidebar" v-if="selectedId && sidebarOpen">
        <PersonCard
          :person="selectedPerson"
          :selectedId="selectedId"
          :parents="selectedParents"
          :children="selectedChildren"
          :spouse="selectedSpouse"
          @close="closePerson"
        />
      </aside>
    </div>

    <PersonFormModal
      v-if="activeModal"
      :mode="activeModal"
      :person="selectedPerson"
      :spouse="selectedSpouse"
      @close="closeModal"
      @submit="handleModalSubmit"
    />

    <div v-if="showExport" class="modal-overlay" @click.self="closeExport">
      <div class="modal">
        <div class="modal__header">
          <h3>Export family data</h3>
          <button type="button" class="modal__close" @click="closeExport">×</button>
        </div>
        <p class="modal__hint">
          Changes are only saved in this browser. Copy this JSON and paste it over the
          <code>familyMembers</code> array in <code>src/data/familyData.js</code> to make it permanent for everyone.
        </p>
        <textarea class="export-textarea" readonly :value="exportMembersJson()"></textarea>
        <div class="modal__actions">
          <button type="button" class="modal__cancel" @click="closeExport">Close</button>
          <button type="button" class="modal__submit" @click="copyExport">
            {{ exportCopied ? 'Copied!' : 'Copy to clipboard' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.family-map__chart {
  position: relative;
  padding: 12px;
  overflow: hidden;
  min-width: max-content;
  width: 100%;
  cursor: grab;
  touch-action: none;
}
.family-map__chart.is-panning {
  cursor: grabbing;
  user-select: none;
}
.family-map__zoom-layer {
  position: relative;
  transform-origin: top left;
  width: max-content;
}
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.zoom-controls button {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}
.zoom-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.zoom-controls .zoom-reset {
  width: auto;
  padding: 0 10px;
  font-size: 0.85rem;
}
.zoom-level {
  min-width: 48px;
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
}
.family-connections {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
.connection.spouse {
  stroke: #6b7280;
  stroke-width: 2;
}
.connection.parent {
  stroke: #374151;
  stroke-width: 1.5;
  stroke-dasharray: 0;
}
.tree-root {
  display: flex;
  justify-content: center;
  gap: 48px;
  align-items: flex-start;
  padding: 20px 0;
}
.family-layout {
  display: grid;
  grid-template-columns: 1.4fr 0.85fr;
  gap: 24px;
  align-items: start;
}
.family-sidebar {
  max-width: 420px;
}
.page-header {
  margin-bottom: 22px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #6b7280;
  font-size: 0.8rem;
  margin-bottom: 8px;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: #fff;
  border-radius: 10px;
  width: min(480px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  padding: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
}
.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.modal__header h3 {
  margin: 0;
  font-size: 1.05rem;
}
.modal__close {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #374151;
}
.modal__hint {
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.5;
}
.export-textarea {
  width: 100%;
  height: 260px;
  box-sizing: border-box;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 10px;
  resize: vertical;
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}
.modal__cancel {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
}
.modal__submit {
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
  padding: 8px 14px;
  font-weight: 600;
  cursor: pointer;
}
</style>
