<script setup>
import { computed } from 'vue'

const props = defineProps({
  person: {
    type: Object,
    required: true
  },
  selectedId: {
    type: String,
    required: false
  },
  parents: {
    type: Array,
    default: () => []
  },
  children: {
    type: Array,
    default: () => []
  },
  spouse: {
    type: Object,
    default: null
  }
})

const isSelected = computed(() => props.person.id === props.selectedId)
</script>

<template>
  <div class="person-card" :class="{ selected: isSelected }">
    <button class="person-card__close" @click="$emit('close')">×</button>
    <div class="person-card__header">
      <div class="person-card__title">
        <h2>{{ person.name }}</h2>
        <span>{{ person.birth }}<template v-if="person.death"> – {{ person.death }}</template></span>
      </div>
      <div class="person-card__avatar">
        <img :src="person.image || '/favicon.svg'" :alt="person.name + ' avatar'" />
      </div>
    </div>

    <p class="person-card__notes">{{ person.notes }}</p>

    <div class="person-card__meta">
      <div>
        <strong>Spouse</strong>
        <p>{{ spouse ? spouse.name : 'None listed' }}</p>
      </div>
      <div>
        <strong>Parents</strong>
        <p>{{ parents.length ? parents.map(p => p.name).join(', ') : 'Unknown' }}</p>
      </div>
      <div>
        <strong>Children</strong>
        <p>{{ children.length ? children.map(c => c.name).join(', ') : 'No children listed' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.person-card{position:relative}
.person-card__header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}
.person-card__close{position:absolute;right:12px;top:12px;border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:#374151}
.person-card__title h2{margin:0;font-size:1.1rem}
.person-card__avatar img{width:56px;height:56px;border-radius:50%;object-fit:cover}
.person-card__meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
</style>
