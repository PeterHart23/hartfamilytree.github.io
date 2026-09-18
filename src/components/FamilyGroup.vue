<script setup>
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
        <img class="node-avatar" :src="parent.image || '/favicon.svg'" :alt="parent.name + ' avatar'" />
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
  background: #fff;
  border: 1px solid #e5e7eb;
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
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25), 0 6px 18px rgba(0, 0, 0, 0.08);
}
.node-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  background: #f3f4f6;
}
.node-text {
  display: grid;
  gap: 4px;
  justify-items: center;
}
.node-name {
  font-weight: 600;
  display: block;
}
.node-birth {
  color: #6b7280;
  font-size: 0.95rem;
}
</style>
