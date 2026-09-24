<script setup>
import { computed } from 'vue'
import { isAdmin } from '../store/adminAuth'
import { theme } from '../store/themeStore'
import unknownAvatar from '../assets/unknown.webp'

const props = defineProps({
  person: {
    type: Object,
    required: true
  },
  selectedId: {
    type: String,
    required: false
  }
})

defineEmits(['close', 'action'])

const isSelected = computed(() => props.person.id === props.selectedId)
</script>

<template>
  <div
    class="person-card"
    :class="{
      selected: isSelected,
      'person-card--minimal': theme === 'minimalist',
      'person-card--midcentury': theme === 'midCenturyModern'
    }"
  >
    <button class="person-card__close" @click="$emit('close')">×</button>
    <div class="person-card__header">
      <div class="person-card__avatar">
        <img :src="person.image || unknownAvatar" :alt="person.name + ' avatar'" />
      </div>
      <div class="person-card__title">
        <h2>{{ person.name }}</h2>
        <span>{{ person.birth }}<template v-if="person.death"> – {{ person.death }}</template></span>
      </div>
    </div>

    <p class="person-card__notes">{{ person.notes }}</p>

    <div v-if="isAdmin" class="person-card__admin-actions">
      <button type="button" class="person-card__edit" @click="$emit('action', 'edit-person')">Edit Person</button>
      <button
        type="button"
        :disabled="person.parentIds.length > 0"
        :title="person.parentIds.length > 0 ? 'Already has parents' : ''"
        @click="$emit('action', 'add-parents')"
      >
        Add Parents
      </button>
      <button
        type="button"
        :disabled="person.parentIds.length === 0"
        :title="person.parentIds.length === 0 ? 'Add this person\'s parents first' : ''"
        @click="$emit('action', 'add-sibling')"
      >
        Add Sibling
      </button>
      <button type="button" @click="$emit('action', 'add-partner')">Add Partner</button>
      <button type="button" @click="$emit('action', 'add-child')">Add Child</button>
      <button type="button" class="person-card__delete" @click="$emit('action', 'delete-person')">Delete Person</button>
    </div>
  </div>
</template>

<style scoped>
.person-card{
  position:relative;
  width:100%;
  box-sizing:border-box;
  background:var(--accent-bg, #f5f0ff);
  border:1px solid var(--accent-border, #126116);
  border-radius:16px;
  padding:24px;
  box-shadow:var(--shadow, 0 6px 18px rgba(0, 0, 0, 0.08));
}
.person-card.selected{
  border-color:#054105;
  background-color:#5f2d16;
}
.person-card__header{
  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;
  gap:12px;
   white-space:nowrap;
}
.person-card__close{position:absolute;right:12px;top:12px;border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:white}
.person-card__title h2{margin:0;font-size:1.1rem}
.person-card__avatar img{width:96px;height:96px;border-radius:50%;object-fit:cover}
.person-card__admin-actions{
  display:flex;
  flex-direction:column;
  gap:8px;
  margin-top:16px;
  padding-top:16px;
  border-top:1px solid #e5e7eb;
}
.person-card__admin-actions button{
  border:1px solid #d1d5db;
  background:#f9fafb;
  border-radius:6px;
  padding:8px 10px;
  font-size:0.85rem;
  cursor:pointer;
  white-space:nowrap;
  color: #000;
}
.person-card__admin-actions button:hover{
  border-color:#0d2f69;
}
.person-card__admin-actions button:disabled{
  opacity:0.5;
  cursor:not-allowed;
}
.person-card__admin-actions button:disabled:hover{
  border-color:#d1d5db;
}
.person-card__delete{
  background:#b91c1c !important;
  border-color:#fca5a5;
  color:#f8f3f3 !important;
}
.person-card__delete:hover{
  border-color:#b91c1c;
}
/* short landscape phone screens: shrink the card so it fits without covering the whole view, staying vertical */
@media (max-height: 500px) and (orientation: landscape) {
  .person-card {
    padding: 10px 16px;
  }
  .person-card__avatar img {
    width: 56px;
    height: 56px;
  }
  .person-card__title h2 {
    font-size: 1rem;
  }
  .person-card__notes {
    font-size: 0.85rem;
  }
  .person-card__admin-actions {
    flex-direction: row;
    flex-wrap: wrap;
    margin-top: 8px;
    padding-top: 8px;
  }
  .person-card__admin-actions button {
    flex: 1 1 auto;
  }
}
.person-card__edit{
  background:#15803d !important;
  border-color:#15803d;
  color:#fff !important;
}
.person-card__edit:hover{
  border-color:#166534;
}

.person-card--minimal{
  border-radius:0;
  font-family:Arial, sans-serif;
}
.person-card--minimal.selected{
  background:#fff;
  border-color:#000;
  color:#000;
}
.person-card--minimal .person-card__title span{
  color:#374151;
}
.person-card--minimal .person-card__close{
  color:#000;
}
.person-card--minimal .person-card__notes{
  color:#000;
}

.person-card--midcentury{
  background:#fdfbf6;
  border-color:#b1502c;
  border-radius:28px;
  font-family:'Josefin Sans', sans-serif;
}
.person-card--midcentury.selected{
  background:#fdfbf6;
  border-color:#b1502c;
}
.person-card--midcentury .person-card__title h2{
  color:#2b2320;
  font-family:'Josefin Sans', sans-serif;
}
.person-card--midcentury .person-card__title span,
.person-card--midcentury .person-card__notes{
  color:#5c4f45;
}
.person-card--midcentury .person-card__close{
  color:#2b2320;
}
.person-card--midcentury .person-card__admin-actions{
  border-top-color:#e4ddce;
}
.person-card--midcentury .person-card__admin-actions button{
  border-radius:14px;
}
</style>
