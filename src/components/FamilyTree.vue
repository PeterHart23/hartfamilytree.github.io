<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import PersonCard from './PersonCard.vue'
import FamilyGroup from './FamilyGroup.vue'
import AdminBar from './AdminBar.vue'
import TreeSwitcher from './TreeSwitcher.vue'
import PersonFormModal from './PersonFormModal.vue'
import { members as familyMembers, isLoading, loadError, loadMembers, updatePerson, addPartner, addSibling, addChild, addParents, deletePerson } from '../store/familyStore'
import { trees } from '../store/treeStore'
import { theme } from '../store/themeStore'
import { deleteAvatar } from '../lib/avatarStorage'
import branchImage from '../assets/branch.webp'

const route = useRoute()
const treeId = computed(() => route.params.slug)
loadMembers(treeId.value)

watchEffect(() => {
  document.title = trees.find(t => t.id === treeId.value)?.name || 'Family Tree'
})

const selectedId = ref(null)
const sidebarOpen = ref(true)
const sidebarVisible = computed(() => !!(selectedId.value && sidebarOpen.value))

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
  // Anyone whose spouse cluster includes a blood relative (someone with
  // recorded parents) gets rendered alongside that relative instead of as
  // their own independent root, however many marriages away they are. This
  // must not depend on array order — Supabase doesn't guarantee row order.
  return familyMembers.filter(member => {
    if (member.parentIds.length > 0) return false
    const cluster = getSpouseCluster(member.id)
    return cluster.every(cid => membersById.value[cid].parentIds.length === 0)
  })
})

const birthTimestamp = member => {
  const date = new Date(member?.birth)
  return Number.isFinite(date.getTime()) ? date.getTime() : 0
}

// Every person connected to startId via spouseIds, however many hops away
// (e.g. a blood relative's spouse, and that spouse's other partner). They
// all need to render together in one group.
function getSpouseCluster(startId) {
  const cluster = new Set([startId])
  const queue = [startId]
  while (queue.length) {
    const current = membersById.value[queue.shift()]
    if (!current) continue
    current.spouseIds.forEach(sid => {
      if (!cluster.has(sid) && membersById.value[sid]) {
        cluster.add(sid)
        queue.push(sid)
      }
    })
  }
  return [...cluster]
}

function dedupeById(list) {
  const seen = new Set()
  return list.filter(item => (seen.has(item.id) ? false : seen.add(item.id)))
}

// Build a proper tree: each node represents a couple/single (or a cluster of
// partners, all shown in the same row) with their own children nested
// beneath them. `processed` is shared across every recursive call so a
// person already placed in one group (e.g. an in-law claimed by their
// blood-relative spouse's branch) never spawns a duplicate branch elsewhere.
function buildGroups(memberIds, processed) {
  const groups = []

  memberIds.forEach(id => {
    if (processed.has(id)) return
    const member = membersById.value[id]
    if (!member) return

    const clusterIds = getSpouseCluster(id)
    clusterIds.forEach(cid => processed.add(cid))
    const clusterMembers = clusterIds.map(cid => membersById.value[cid])

    // With 3+ partners, sandwich the shared hub between them instead of
    // sorting everyone alphabetically — otherwise the hub can end up off to
    // one side, and the connector line to the far partner visually cuts
    // through the near partner's card, making it look like the two partners
    // are paired with each other instead of with the shared hub.
    let parents
    if (clusterMembers.length <= 2) {
      parents = clusterIds.slice().sort().map(cid => membersById.value[cid])
    } else {
      const hub = clusterMembers.reduce((best, m) => (m.spouseIds.length > best.spouseIds.length ? m : best))
      const others = clusterMembers.filter(m => m.id !== hub.id).sort((a, b) => (a.id < b.id ? -1 : 1))
      const mid = Math.ceil(others.length / 2)
      parents = [...others.slice(0, mid), hub, ...others.slice(mid)]
    }

    const childMembers = dedupeById(clusterIds.flatMap(cid => childrenMap.value[cid] || []))
      .sort((a, b) => birthTimestamp(a) - birthTimestamp(b))
    const childIds = childMembers.map(child => child.id)
    const childGroups = childIds.length ? buildGroups(childIds, processed) : []

    groups.push({
      key: clusterIds.slice().sort().join('::'),
      parents,
      childGroups
    })
  })

  return groups
}

const familyTree = computed(() => buildGroups(rootMembers.value.map(m => m.id), new Set()))

const selectedPerson = computed(() => membersById.value[selectedId.value] || familyMembers[0])
const selectedSpouses = computed(() => selectedPerson.value.spouseIds.map(sid => membersById.value[sid]).filter(Boolean))

function selectPerson(person) {
  if (selectedId.value === person.id) {
    sidebarOpen.value = !sidebarOpen.value
    if (!sidebarOpen.value) selectedId.value = null
  } else {
    selectedId.value = person.id
    sidebarOpen.value = true
  }
}

function closePerson() {
  sidebarOpen.value = false
  selectedId.value = null
}

const activeModal = ref(null)
const savingModal = ref(false)
const saveError = ref('')

function handleAdminAction(action) {
  if (!selectedId.value) return
  if (action === 'delete-person') {
    handleDeletePerson()
    return
  }
  activeModal.value = action
}

async function handleDeletePerson() {
  const person = selectedPerson.value
  if (!person) return
  if (!window.confirm(`Delete ${person.name}? This cannot be undone.`)) return

  try {
    await deletePerson(person.id)
    selectedId.value = familyMembers.length ? familyMembers[0].id : null
    sidebarOpen.value = false
  } catch (err) {
    window.alert(err.message || 'Something went wrong deleting from the database.')
    console.error(err)
  }
}

function closeModal() {
  activeModal.value = null
  saveError.value = ''
}

async function handleModalSubmit(payload) {
  const personId = selectedPerson.value.id
  savingModal.value = true
  saveError.value = ''
  try {
    switch (activeModal.value) {
      case 'edit-person':
        await updatePerson(personId, payload.data)
        break
      case 'add-partner':
        await addPartner(personId, payload.data)
        break
      case 'add-sibling':
        await addSibling(personId, payload.data)
        break
      case 'add-child':
        await addChild(personId, payload.data, { spouseId: payload.spouseId })
        break
      case 'add-parents':
        await addParents(personId, payload.parents)
        break
    }
    if (payload.oldImagePath) await deleteAvatar(payload.oldImagePath)
    activeModal.value = null
  } catch (err) {
    saveError.value = err.message || 'Something went wrong saving to the database.'
    console.error(err)
  } finally {
    savingModal.value = false
  }
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
  nextTick(() => centerRootHorizontally())
}

// Keep the point under the cursor fixed on screen while zooming: work out
// which "content" coordinate (in unscaled local units) is currently under
// the cursor, then after the zoom level changes, adjust the pan offset so
// that same content coordinate lands back under the cursor. This is done
// with explicit pan state rather than native scrollLeft/scrollTop because
// the container may not be scrollable at all zoom levels (e.g. when the
// content is smaller than the viewport while zoomed out).
function applyZoomAtPoint(cursorX, cursorY, newZoomValue) {
  const oldZoom = zoom.value
  const contentX = (cursorX - panX.value) / oldZoom
  const contentY = (cursorY - panY.value) / oldZoom

  zoom.value = newZoomValue

  panX.value = cursorX - contentX * newZoomValue
  panY.value = cursorY - contentY * newZoomValue
}

function zoomAtPoint(cursorX, cursorY, direction) {
  const step = direction < 0 ? 0.1 : -0.1
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(zoom.value + step).toFixed(2)))
  applyZoomAtPoint(cursorX, cursorY, newZoom)
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

// Click-and-drag panning of the chart, plus two-finger pinch-to-zoom on
// touch devices. Tracked via window listeners (not setPointerCapture)
// because pointer capture retargets the resulting click event to the
// capturing element, which breaks click handlers on nested cards.
const isPanning = ref(false)
const dragMoved = ref(false)
const DRAG_THRESHOLD = 4
const dragStart = { x: 0, y: 0 }
const panOrigin = { x: 0, y: 0 }
const activePointers = new Map()
let pinchStartDistance = 0
let pinchStartZoom = 1

function pointerDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function pointerMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function beginPan(x, y) {
  isPanning.value = true
  dragMoved.value = false
  dragStart.x = x
  dragStart.y = y
  panOrigin.x = panX.value
  panOrigin.y = panY.value
}

function onChartPointerDown(event) {
  if (event.button !== 0) return
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (activePointers.size === 2) {
    isPanning.value = false
    const [a, b] = [...activePointers.values()]
    pinchStartDistance = pointerDistance(a, b)
    pinchStartZoom = zoom.value
  } else if (activePointers.size === 1) {
    beginPan(event.clientX, event.clientY)
  }

  window.addEventListener('pointermove', onWindowPointerMove)
  window.addEventListener('pointerup', onWindowPointerUp)
  window.addEventListener('pointercancel', onWindowPointerUp)
}

function onWindowPointerMove(event) {
  if (!activePointers.has(event.pointerId)) return
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (activePointers.size === 2) {
    const [a, b] = [...activePointers.values()]
    if (pinchStartDistance > 0) {
      const distance = pointerDistance(a, b)
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(pinchStartZoom * (distance / pinchStartDistance)).toFixed(3)))
      const mid = pointerMidpoint(a, b)
      const rect = chartRef.value?.getBoundingClientRect()
      applyZoomAtPoint(mid.x - (rect?.left ?? 0), mid.y - (rect?.top ?? 0), newZoom)
    }
    return
  }

  if (!isPanning.value) return
  const dx = event.clientX - dragStart.x
  const dy = event.clientY - dragStart.y
  if (!dragMoved.value && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    dragMoved.value = true
  }
  panX.value = panOrigin.x + dx
  panY.value = panOrigin.y + dy
}

function onWindowPointerUp(event) {
  activePointers.delete(event.pointerId)

  if (activePointers.size === 1) {
    // One finger remains after a pinch — resume panning from its current
    // position instead of jumping back to wherever the drag last started.
    const [remaining] = [...activePointers.values()]
    beginPan(remaining.x, remaining.y)
  } else if (activePointers.size === 0) {
    isPanning.value = false
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
    window.removeEventListener('pointercancel', onWindowPointerUp)
  }
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
    m.spouseIds.forEach(sid => {
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

    const childPositions = coupleChildren.map(child => ({ child, pos: byId[child.id] })).filter(cp => cp.pos)
    if (!childPositions.length) return

    // All children share one branch row off the trunk, drawn once so it
    // isn't redrawn (and visually thickened) per child.
    const childTop = Math.min(...childPositions.map(cp => cp.pos.top))
    const elbowY = (trunkBottomY + childTop) / 2
    paths.push({
      points: [
        [midX, trunkBottomY],
        [midX, elbowY]
      ],
      type: 'parent',
      id: 'branch::' + coupleKey
    })

    // One shared horizontal row spanning every child, so overlapping
    // children on the same side of the trunk don't redraw the same stretch.
    const rowXs = childPositions.map(cp => cp.pos.cx).concat(midX)
    paths.push({
      points: [
        [Math.min(...rowXs), elbowY],
        [Math.max(...rowXs), elbowY]
      ],
      type: 'parent',
      id: 'branch-row::' + coupleKey
    })

    childPositions.forEach(({ child, pos }) => {
      paths.push({
        points: [
          [pos.cx, elbowY],
          [pos.cx, pos.top]
        ],
        type: 'parent',
        id: coupleKey + '->' + child.id
      })
    })
  })

  // Process single parents with children
  Object.entries(childrenBySingle).forEach(([parentId, singleChildren]) => {
    // No need to skip parents who've since gained a spouse: a child only
    // ends up in childrenBySingle when its own parentIds still has just this
    // one parent (childrenByCouple handles the parentIds.length === 2 case),
    // so the two buckets never overlap for the same child.
    const p = byId[parentId]
    if (!p) return

    const childPositions = singleChildren.map(child => ({ child, pos: byId[child.id] })).filter(cp => cp.pos)
    if (!childPositions.length) return

    // All children share one branch row off the parent, drawn once so it
    // isn't redrawn (and visually thickened) per child.
    const childTop = Math.min(...childPositions.map(cp => cp.pos.top))
    const elbowY = (p.bottom + childTop) / 2
    paths.push({
      points: [
        [p.cx, p.bottom],
        [p.cx, elbowY]
      ],
      type: 'parent',
      id: 'branch::' + parentId
    })

    // One shared horizontal row spanning every child, so overlapping
    // children on the same side of the parent don't redraw the same stretch.
    const rowXs = childPositions.map(cp => cp.pos.cx).concat(p.cx)
    paths.push({
      points: [
        [Math.min(...rowXs), elbowY],
        [Math.max(...rowXs), elbowY]
      ],
      type: 'parent',
      id: 'branch-row::' + parentId
    })

    childPositions.forEach(({ child, pos }) => {
      paths.push({
        points: [
          [pos.cx, elbowY],
          [pos.cx, pos.top]
        ],
        type: 'parent',
        id: parentId + '->' + child.id
      })
    })
  })

  connections.value = toSegments(paths)
}

// Break a multi-point elbow path into individual horizontal/vertical segments
// so each one can use a pattern oriented to match its direction.
function toSegments(paths) {
  const segments = []
  paths.forEach(path => {
    for (let i = 0; i < path.points.length - 1; i++) {
      const [x1, y1] = path.points[i]
      const [x2, y2] = path.points[i + 1]
      const orientation = Math.abs(x2 - x1) >= Math.abs(y2 - y1) ? 'horizontal' : 'vertical'
      segments.push({ x1, y1, x2, y2, orientation, id: `${path.id}::${i}` })
    }
  })
  return segments
}

// SVG filters (feTurbulence/feDisplacementMap) collapse to nothing on a
// perfectly axis-aligned line, since its bounding box has zero width or
// height. Drawing the wave as an actual path sidesteps that. Points are
// smoothed into a curve (quadratic segments through midpoints) instead of
// straight segments so the wave reads as smooth rather than jagged.
function wavyPathD(seg) {
  const { x1, y1, x2, y2, orientation } = seg
  const length = orientation === 'vertical' ? Math.abs(y2 - y1) : Math.abs(x2 - x1)
  const wavelength = 36
  const amplitude = 3
  const steps = Math.max(4, Math.round(length / 8))
  const points = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const dist = length * t
    const wave = i === 0 || i === steps ? 0 : Math.sin((dist / wavelength) * Math.PI * 2) * amplitude
    if (orientation === 'vertical') {
      points.push([x1 + wave, y1 + (y2 - y1) * t])
    } else {
      points.push([x1 + (x2 - x1) * t, y1 + wave])
    }
  }

  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
  for (let i = 1; i < points.length - 1; i++) {
    const [cx, cy] = points[i]
    const [nx, ny] = points[i + 1]
    d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${((cx + nx) / 2).toFixed(1)} ${((cy + ny) / 2).toFixed(1)}`
  }
  const last = points[points.length - 1]
  d += ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`
  return d
}

// Center the first generation horizontally the first time the tree renders.
const hasCenteredRoot = ref(false)

function centerRootHorizontally() {
  const chart = chartRef.value
  const layer = zoomLayerRef.value
  if (!chart || !layer) return
  const rows = layer.querySelectorAll('.tree-root > .parent-group > .parents-row')
  if (!rows.length) return

  const chartRect = chart.getBoundingClientRect()
  let minLeft = Infinity
  let maxRight = -Infinity
  rows.forEach(row => {
    const r = row.getBoundingClientRect()
    minLeft = Math.min(minLeft, r.left)
    maxRight = Math.max(maxRight, r.right)
  })

  const rowsCenterX = (minLeft + maxRight) / 2
  const chartCenterX = chartRect.left + chartRect.width / 2
  panX.value += chartCenterX - rowsCenterX
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
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
  window.removeEventListener('pointercancel', onWindowPointerUp)
})

watch([familyTree, selectedId], () => {
  nextTick(() => {
    computeConnections()
    if (!hasCenteredRoot.value && familyTree.value.length) {
      centerRootHorizontally()
      hasCenteredRoot.value = true
    }
  })
})

watch(zoom, () => {
  nextTick(() => computeConnections())
})
</script>

<template>
  <div class="family-tree-page" :class="{ 'theme-minimalist': theme === 'minimalist', 'theme-mid-century': theme === 'midCenturyModern' }">
    <header class="page-header">
      <div>
        <TreeSwitcher :current-tree-id="treeId" />
      </div>
      <AdminBar />
    </header>

    <div class="family-layout">
      <aside class="family-sidebar" v-if="sidebarVisible">
        <PersonCard
          :person="selectedPerson"
          :selectedId="selectedId"
          @close="closePerson"
          @action="handleAdminAction"
        />
      </aside>

      <section class="family-map">
        <div class="family-map__header">
          <p v-if="isLoading">Loading family data…</p>
          <p v-else-if="loadError" class="family-map__load-error">Couldn't reach the database, showing offline data. ({{ loadError }})</p>
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
          @click.capture="onChartClickCapture"
        >
          <div class="family-map__zoom-layer" ref="zoomLayerRef" :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }">
          <svg class="family-connections" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <defs>
              <pattern id="branch-pattern-vertical" width="36" height="36" patternUnits="userSpaceOnUse">
                <image :href="branchImage" x="-126" y="-126" width="288" height="288" />
              </pattern>
              <pattern id="branch-pattern-horizontal" width="36" height="36" patternUnits="userSpaceOnUse">
                <image :href="branchImage" x="-126" y="-126" width="295" height="288" transform="rotate(90 18 18)" />
              </pattern>
            </defs>
            <g>
              <template v-for="seg in connections" :key="seg.id">
                <path
                  v-if="theme === 'midCenturyModern'"
                  :d="wavyPathD(seg)"
                  fill="none"
                  :class="['connection', seg.orientation]"
                  stroke-linecap="round"
                />
                <line
                  v-else
                  :x1="seg.x1"
                  :y1="seg.y1"
                  :x2="seg.x2"
                  :y2="seg.y2"
                  :class="['connection', seg.orientation]"
                  stroke-linecap="round"
                />
              </template>
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
    </div>

    <PersonFormModal
      v-if="activeModal"
      :mode="activeModal"
      :person="selectedPerson"
      :spouses="selectedSpouses"
      :error="saveError"
      :saving="savingModal"
      @close="closeModal"
      @submit="handleModalSubmit"
    />
  </div>
</template>

<style scoped>
.family-tree-page {
  position: relative;
  padding: 10px;
  box-sizing: border-box;
}
.family-tree-page.theme-minimalist {
  background: #fff;
}
.family-tree-page.theme-minimalist .connection.vertical,
.family-tree-page.theme-minimalist .connection.horizontal {
  stroke: #000;
}
.family-tree-page.theme-mid-century {
  background: #fdfbf6;
}
.family-tree-page.theme-mid-century .connection.vertical,
.family-tree-page.theme-mid-century .connection.horizontal {
  stroke: #000;
  stroke-width: 4;
}
.family-map__chart {
  position: relative;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
  width: 100%;
  /* Fill the viewport even when the tree has very little content (e.g. a
     brand-new tree with one node), so the whole visible area stays pannable
     instead of only the small area the content happens to occupy. */
  min-height: calc(100vh - 20px);
  cursor: grab;
  /* Pinch-to-zoom and drag-to-pan are both handled ourselves via pointer
     events, so the browser's own touch gestures need to stay out of the way. */
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
.family-map__header {
  position: absolute;
  top: 100px;
  left: 0;
  right: 0;
  z-index: 10;
}
.zoom-controls {
  /* sits alongside the page header instead of floating over the map */
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  padding: 6px 8px;
  border-radius: 8px;
  box-shadow: var(--shadow, 0 6px 18px rgba(0, 0, 0, 0.08));
  z-index: 20;
}
.zoom-controls button {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #000;
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
  color: black;
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
.connection.vertical {
  stroke: url(#branch-pattern-vertical);
  stroke-width: 15;
}
.connection.horizontal {
  stroke: url(#branch-pattern-horizontal);
  stroke-width: 15;
}
.tree-root {
  display: flex;
  justify-content: center;
  gap: 48px;
  align-items: flex-start;
  padding: 20px 0;
}
.family-layout {
  position: relative;
}
.family-map {
  position: relative;
  min-width: 0;
}
.family-sidebar {
  position: absolute;
  top: 100px;
  left: 0;
  width: min(360px, calc(100% - 32px));
  z-index: 15;
  /* only the card itself should catch clicks, not the shrink-wrapped box around it */
  pointer-events: none;
}
.family-sidebar > * {
  pointer-events: auto;
}
@media (max-width: 700px) {
  .family-sidebar {
    /* family-layout can be far taller than the viewport, so pin to the viewport itself */
    position: fixed;
    top: auto;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: min(400px, calc(100vw - 20px));
  }
  .zoom-controls {
    display: none;
  }
}
/* short landscape phone screens: keep the card on the left, vertical, sized to the shorter viewport */
@media (max-height: 500px) and (orientation: landscape) {
  .family-sidebar {
    position: fixed;
    top: 56px;
    bottom: auto;
    left: 10px;
    transform: none;
    width: min(320px, calc(100vw - 20px));
    max-height: calc(100vh - 66px);
    overflow-y: auto;
  }
  .zoom-controls {
    display: none;
  }
}
.page-header {
  position: absolute;
  /* an ancestor's own padding doesn't inset its absolutely positioned children, so match the page padding explicitly here */
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  /* the gap between the title and admin button should let clicks/drags reach the tree below */
  pointer-events: none;
}
.page-header > * {
  pointer-events: auto;
}
.family-map__load-error {
  color: #b45309;
}
</style>
