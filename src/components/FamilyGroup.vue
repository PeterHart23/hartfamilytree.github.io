<script setup>
import { computed } from 'vue'
import unknownAvatar from '../assets/unknown.webp'
import { theme } from '../store/themeStore'

defineOptions({ name: 'FamilyGroup' })

defineProps({
  group: {
    type: Object,
    required: true
  },
  selectedId: {
    type: String,
    default: null
  }
})

defineEmits(['select'])

// Mid Century Modern swatches, paired with a readable text color and a
// semi-transparent label-box tint (light box for light swatches, dark box for dark ones).
const MC_COLORS = [
  { bg: '#f0ede4', text: '#2b2320', overlay: 'rgba(255, 255, 255, 0.55)' },
  { bg: '#d7d3ca', text: '#2b2320', overlay: 'rgba(255, 255, 255, 0.55)' },
  { bg: '#a3b184', text: '#26301c', overlay: 'rgba(255, 255, 255, 0.5)' },
  { bg: '#a9835c', text: '#2b2015', overlay: 'rgba(255, 255, 255, 0.45)' },
  { bg: '#a8c4c2', text: '#1f2f2e', overlay: 'rgba(255, 255, 255, 0.5)' },
  { bg: '#f0ad4e', text: '#3b2410', overlay: 'rgba(255, 255, 255, 0.5)' },
  { bg: '#3c2a24', text: '#f1ece2', overlay: 'rgba(0, 0, 0, 0.4)' },
  { bg: '#b1502c', text: '#f7ece0', overlay: 'rgba(0, 0, 0, 0.35)' },
  { bg: '#1f5f6b', text: '#eef7f5', overlay: 'rgba(0, 0, 0, 0.35)' }
]
const MC_CORNERS = ['mc-corner-tl', 'mc-corner-tr', 'mc-corner-bl', 'mc-corner-br']

// Deterministic per-id "randomness" so a node's color/corner stays put across re-renders.
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function mcColorFor(id) {
  return MC_COLORS[hashString(id) % MC_COLORS.length]
}

function mcCornerFor(id) {
  return MC_CORNERS[hashString(`corner-${id}`) % MC_CORNERS.length]
}

// Keep the avatar clear of whichever vertical half the corner text landed in.
function mcAvatarPushClass(id) {
  const isTopCorner = mcCornerFor(id).endsWith('tl') || mcCornerFor(id).endsWith('tr')
  return isTopCorner ? 'node-avatar--push-down' : 'node-avatar--push-up'
}

const hideAvatar = computed(() => theme.value === 'minimalist')
</script>

<template>
  <div class="parent-group">
    <div class="parents-row">
      <div
        v-for="parent in group.parents"
        :key="parent.id"
        class="family-node"
        :data-id="parent.id"
        :class="{
          active: parent.id === selectedId,
          'family-node--minimal': theme === 'minimalist',
          'family-node--midcentury': theme === 'midCenturyModern'
        }"
        :style="theme === 'midCenturyModern' ? { background: mcColorFor(parent.id).bg } : null"
        @click="$emit('select', parent)">
        <img
          v-if="!hideAvatar"
          class="node-avatar"
          :class="theme === 'midCenturyModern' ? mcAvatarPushClass(parent.id) : null"
          :src="parent.image || unknownAvatar"
          :alt="parent.name + ' avatar'"
        />
        <div
          class="node-text"
          :class="theme === 'midCenturyModern' ? mcCornerFor(parent.id) : null"
          :style="theme === 'midCenturyModern' ? { color: mcColorFor(parent.id).text, background: mcColorFor(parent.id).overlay } : null"
        >
          <span class="node-name">{{ parent.name }}</span>
          <span v-if="theme !== 'minimalist'" class="node-birth">{{ parent.birth }}</span>
        </div>
      </div>
    </div>

    <div v-if="group.childGroups.length > 0" class="children-row">
      <FamilyGroup
        v-for="childGroup in group.childGroups"
        :key="childGroup.key"
        :group="childGroup"
        :selected-id="selectedId"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.parent-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 80px;
}
.parents-row {
  display: flex;
  justify-content: center;
  gap: 32px;
  align-items: flex-start;
}
.children-row {
  display: flex;
  justify-content: center;
  gap: 32px;
  align-items: flex-start;
  flex-wrap: nowrap;
}
.family-node {
  background:
    linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0)),
    url('../assets/leaveNoBG.jpg') center/cover no-repeat;
  border: 1px solid transparent;
  padding: 16px 14px;
  border-radius: 8px;
  cursor: pointer;
  width: 190px;
  min-height: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
}
.family-node.active {
  border-color: #e70808;
  box-shadow: 0 0 0 3px #f70202, 0 6px 18px rgba(0, 0, 0, 0.08);
}
.family-node--minimal {
  background: #fff;
  border-color: #000;
  justify-content: center;
}
.family-node--minimal .node-text {
  background: none;
  padding: 0;
  text-align: center;
}
.family-node--minimal .node-name {
  color: #000;
}
.family-node--minimal.active {
  border-color: #e70808;
}
.family-node--midcentury {
  border: 2px solid transparent;
  border-radius: 28px;
  width: 220px;
  min-height: 235px;
}
.family-node--midcentury.active {
  border-color: #e70808;
}
.node-avatar--push-down {
  margin-top: auto;
}
.node-avatar--push-up {
  margin-bottom: auto;
}
.node-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  background: #f3f4f6;
}
.node-text {
  display: grid;
  gap: 4px;
  justify-items: center;
  color: white;
  background: rgba(0, 0, 0, 0.65);
  border-radius: 6px;
  padding: 6px 10px;
}
.family-node--midcentury .node-text {
  padding: 4px 10px;
  border-radius: 8px;
}
.family-node--midcentury .node-name,
.family-node--midcentury .node-birth {
  color: inherit;
}
.node-text.mc-corner-tl,
.node-text.mc-corner-bl {
  justify-items: start;
  text-align: left;
}
.node-text.mc-corner-tr,
.node-text.mc-corner-br {
  justify-items: end;
  text-align: right;
}
.node-text.mc-corner-tl {
  position: absolute;
  top: 14px;
  left: 16px;
}
.node-text.mc-corner-tr {
  position: absolute;
  top: 14px;
  right: 16px;
}
.node-text.mc-corner-bl {
  position: absolute;
  bottom: 14px;
  left: 16px;
}
.node-text.mc-corner-br {
  position: absolute;
  bottom: 14px;
  right: 16px;
}
.node-name {
  font-weight: 650;
  display: block;
  color: white;
}
.node-birth {
  color: white;
  font-size: 0.95rem;
}
</style>
