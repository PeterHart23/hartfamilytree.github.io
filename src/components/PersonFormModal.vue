<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  mode: {
    type: String,
    required: true // 'edit-person' | 'add-parents' | 'add-sibling' | 'add-partner' | 'add-child'
  },
  person: {
    type: Object,
    required: true
  },
  spouse: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'submit'])

const titles = {
  'edit-person': `Edit ${props.person.name}`,
  'add-parents': `Add Parents for ${props.person.name}`,
  'add-sibling': `Add Sibling for ${props.person.name}`,
  'add-partner': `Add Partner for ${props.person.name}`,
  'add-child': `Add Child of ${props.person.name}`
}
const title = computed(() => titles[props.mode] || 'Edit')

function emptyForm() {
  return { name: '', birth: '', death: '', image: '', notes: '' }
}

const form = ref(
  props.mode === 'edit-person'
    ? {
        name: props.person.name || '',
        birth: props.person.birth || '',
        death: props.person.death || '',
        image: props.person.image || '',
        notes: props.person.notes || ''
      }
    : emptyForm()
)

const parentTwo = ref(emptyForm())
const includeSpouseAsParent = ref(!!props.spouse)

function handleSubmit() {
  if (props.mode === 'add-parents') {
    const parents = [form.value]
    if (parentTwo.value.name.trim()) parents.push(parentTwo.value)
    emit('submit', { parents })
    return
  }
  if (props.mode === 'add-child') {
    emit('submit', { data: form.value, includeSpouse: includeSpouseAsParent.value })
    return
  }
  emit('submit', { data: form.value })
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal__header">
        <h3>{{ title }}</h3>
        <button type="button" class="modal__close" @click="$emit('close')">×</button>
      </div>

      <form class="modal__form" @submit.prevent="handleSubmit">
        <label>
          Name
          <input v-model="form.name" type="text" required autofocus />
        </label>
        <div class="modal__row">
          <label>
            Birth
            <input v-model="form.birth" type="text" placeholder="MM/DD/YYYY" />
          </label>
          <label>
            Death
            <input v-model="form.death" type="text" placeholder="MM/DD/YYYY" />
          </label>
        </div>
        <label>
          Image URL
          <input v-model="form.image" type="text" placeholder="/images/name.jpg" />
        </label>
        <label>
          Notes
          <textarea v-model="form.notes" rows="2"></textarea>
        </label>

        <template v-if="mode === 'add-parents'">
          <hr />
          <p class="modal__hint">Second parent (optional)</p>
          <label>
            Name
            <input v-model="parentTwo.name" type="text" />
          </label>
          <div class="modal__row">
            <label>
              Birth
              <input v-model="parentTwo.birth" type="text" placeholder="MM/DD/YYYY" />
            </label>
            <label>
              Death
              <input v-model="parentTwo.death" type="text" placeholder="MM/DD/YYYY" />
            </label>
          </div>
        </template>

        <label v-if="mode === 'add-child' && spouse" class="modal__checkbox">
          <input type="checkbox" v-model="includeSpouseAsParent" />
          Also list {{ spouse.name }} as a parent
        </label>

        <div class="modal__actions">
          <button type="button" class="modal__cancel" @click="$emit('close')">Cancel</button>
          <button type="submit" class="modal__submit">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
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
  width: min(420px, calc(100vw - 32px));
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
.modal__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal__form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #374151;
}
.modal__form input,
.modal__form textarea {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px;
  font-size: 0.9rem;
  font-family: inherit;
}
.modal__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.modal__hint {
  margin: 0;
  font-size: 0.8rem;
  color: #6b7280;
}
.modal__checkbox {
  flex-direction: row !important;
  align-items: center;
  gap: 8px !important;
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
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
