<script setup>
import unknownAvatar from '../assets/unknown.webp'

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
</script>

<template>
  <div class="parent-group">
    <div class="parents-row">
      <div
        v-for="parent in group.parents"
        :key="parent.id"
        class="family-node"
        :data-id="parent.id"
        :class="{ active: parent.id === selectedId }"
        @click="$emit('select', parent)">
        <img class="node-avatar" :src="parent.image || unknownAvatar" :alt="parent.name + ' avatar'" />
        <div class="node-text">
          <span class="node-name">{{ parent.name }}</span>
          <span class="node-birth">{{ parent.birth }}</span>
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
  color: white !important;
  background: rgba(0, 0, 0, 0.65);
  border-radius: 6px;
  padding: 6px 10px;
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
