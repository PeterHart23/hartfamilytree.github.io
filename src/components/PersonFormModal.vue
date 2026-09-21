<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { uploadAvatar, deleteAvatar, avatarPathFromUrl } from '../lib/avatarStorage'
import ImageCropModal from './ImageCropModal.vue'

const props = defineProps({
  mode: {
    type: String,
    required: true // 'edit-person' | 'add-parents' | 'add-sibling' | 'add-partner' | 'add-child'
  },
  person: {
    type: Object,
    required: true
  },
  spouses: {
    type: Array,
    default: () => []
  },
  saving: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
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
const selectedSpouseId = ref(props.spouses.length === 1 ? props.spouses[0].id : '')
const uploadingImage = ref(false)
const uploadError = ref('')
const cropFile = ref(null)
const nameInputRef = ref(null)

onMounted(() => {
  nameInputRef.value?.select()
})

const DATE_FORMAT_ERROR = 'Use MM/DD/YYYY'

// Formats raw typed digits as MM/DD/YYYY, inserting each slash as soon as
// the segment before it is complete (after the 2nd and 4th digits).
function formatDateDigits(digits) {
  const d = digits.slice(0, 8)
  let out = d.slice(0, 2)
  if (d.length >= 2) out += '/'
  out += d.slice(2, 4)
  if (d.length >= 4) out += '/'
  out += d.slice(4, 8)
  return out
}

function onDateInput(event, target, field) {
  const input = event.target
  const caret = input.selectionStart ?? input.value.length
  const digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, '').length
  const digits = input.value.replace(/\D/g, '').slice(0, 8)
  target[field] = formatDateDigits(digits)

  nextTick(() => {
    const formatted = target[field]
    let seen = 0
    let pos = formatted.length
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        seen++
        if (seen === digitsBeforeCaret) {
          pos = i + 1
          // Land after an immediately-following auto-inserted slash so
          // typing continues past it instead of in front of it.
          while (pos < formatted.length && formatted[pos] === '/') pos++
          break
        }
      }
    }
    if (digitsBeforeCaret === 0) pos = 0
    input.setSelectionRange(pos, pos)
  })
}

// Backspacing right after an auto-inserted slash removes the slash and the
// digit before it together, so the slash doesn't linger requiring an extra keypress.
function onDateKeydown(event, target, field) {
  if (event.key !== 'Backspace') return
  const input = event.target
  if (input.selectionStart !== input.selectionEnd) return
  const pos = input.selectionStart
  if (pos > 0 && input.value[pos - 1] === '/') {
    event.preventDefault()
    const digits = (input.value.slice(0, pos - 2) + input.value.slice(pos)).replace(/\D/g, '').slice(0, 8)
    target[field] = formatDateDigits(digits)
    nextTick(() => input.setSelectionRange(pos - 2, pos - 2))
  }
}

function isValidDateValue(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return true
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (!match) return false
  const month = Number(match[1])
  const day = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12) return false
  const daysInMonth = new Date(year, month, 0).getDate()
  return day >= 1 && day <= daysInMonth
}

const birthError = computed(() => (isValidDateValue(form.value.birth) ? '' : DATE_FORMAT_ERROR))
const deathError = computed(() => (isValidDateValue(form.value.death) ? '' : DATE_FORMAT_ERROR))
const parentTwoBirthError = computed(() => (isValidDateValue(parentTwo.value.birth) ? '' : DATE_FORMAT_ERROR))
const parentTwoDeathError = computed(() => (isValidDateValue(parentTwo.value.death) ? '' : DATE_FORMAT_ERROR))

const hasInvalidDates = computed(() => {
  if (birthError.value || deathError.value) return true
  return props.mode === 'add-parents' && !!(parentTwoBirthError.value || parentTwoDeathError.value)
})

// The image already saved on the person when the modal opened, if any.
const originalImagePath = avatarPathFromUrl(form.value.image)
// An upload made during this session that hasn't been saved yet.
const newUploadPath = ref(null)

function handleFileSelect(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  cropFile.value = file
}

async function handleCropped(blob) {
  cropFile.value = null
  uploadingImage.value = true
  uploadError.value = ''
  try {
    const { path, url } = await uploadAvatar(blob, 'jpg')
    // An earlier upload from this session was never saved, so it's now orphaned.
    if (newUploadPath.value) await deleteAvatar(newUploadPath.value)
    newUploadPath.value = path
    form.value.image = url
  } catch (err) {
    uploadError.value = err.message || 'Failed to upload image.'
    console.error(err)
  } finally {
    uploadingImage.value = false
  }
}

function handleClose() {
  if (newUploadPath.value) deleteAvatar(newUploadPath.value)
  emit('close')
}

function handleSubmit() {
  if (hasInvalidDates.value) return

  // Only clear the previous image once a new one has actually replaced it.
  const oldImagePath = newUploadPath.value ? originalImagePath : null
  if (props.mode === 'add-parents') {
    const parents = [form.value]
    if (parentTwo.value.name.trim()) parents.push(parentTwo.value)
    emit('submit', { parents, oldImagePath })
    return
  }
  if (props.mode === 'add-child') {
    emit('submit', { data: form.value, spouseId: selectedSpouseId.value || null, oldImagePath })
    return
  }
  emit('submit', { data: form.value, oldImagePath })
}
</script>

<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal">
      <div class="modal__header">
        <h3>{{ title }}</h3>
        <button type="button" class="modal__close" @click="handleClose">×</button>
      </div>

      <form class="modal__form" @submit.prevent="handleSubmit">
        <label>
          Name
          <input ref="nameInputRef" v-model="form.name" type="text" required autofocus />
        </label>
        <div class="modal__row">
          <label>
            Birth
            <input
              :value="form.birth"
              type="text"
              placeholder="MM/DD/YYYY"
              maxlength="10"
              @input="onDateInput($event, form, 'birth')"
              @keydown="onDateKeydown($event, form, 'birth')"
            />
            <span v-if="birthError" class="modal__field-error">{{ birthError }}</span>
          </label>
          <label>
            Death
            <input
              :value="form.death"
              type="text"
              placeholder="MM/DD/YYYY"
              maxlength="10"
              @input="onDateInput($event, form, 'death')"
              @keydown="onDateKeydown($event, form, 'death')"
            />
            <span v-if="deathError" class="modal__field-error">{{ deathError }}</span>
          </label>
        </div>
        <label>
          Upload Image
          <input type="file" accept="image/*" :disabled="uploadingImage" @change="handleFileSelect" />
        </label>
        <p v-if="uploadingImage" class="modal__hint">Uploading…</p>
        <p v-if="uploadError" class="modal__error">{{ uploadError }}</p>
        <img v-if="form.image" :src="form.image" alt="Image preview" class="modal__image-preview" />
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
              <input
                :value="parentTwo.birth"
                type="text"
                placeholder="MM/DD/YYYY"
                maxlength="10"
                @input="onDateInput($event, parentTwo, 'birth')"
                @keydown="onDateKeydown($event, parentTwo, 'birth')"
              />
              <span v-if="parentTwoBirthError" class="modal__field-error">{{ parentTwoBirthError }}</span>
            </label>
            <label>
              Death
              <input
                :value="parentTwo.death"
                type="text"
                placeholder="MM/DD/YYYY"
                maxlength="10"
                @input="onDateInput($event, parentTwo, 'death')"
                @keydown="onDateKeydown($event, parentTwo, 'death')"
              />
              <span v-if="parentTwoDeathError" class="modal__field-error">{{ parentTwoDeathError }}</span>
            </label>
          </div>
        </template>

        <label v-if="mode === 'add-child' && spouses.length === 1" class="modal__checkbox">
          <input
            type="checkbox"
            :checked="selectedSpouseId === spouses[0].id"
            @change="selectedSpouseId = $event.target.checked ? spouses[0].id : ''"
          />
          Also list {{ spouses[0].name }} as a parent
        </label>
        <label v-else-if="mode === 'add-child' && spouses.length > 1">
          Also list as a parent
          <select v-model="selectedSpouseId">
            <option value="">None</option>
            <option v-for="s in spouses" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>

        <p v-if="error" class="modal__error">{{ error }}</p>

        <div class="modal__actions">
          <button type="button" class="modal__cancel" @click="handleClose">Cancel</button>
          <button type="submit" class="modal__submit" :disabled="saving || uploadingImage || hasInvalidDates">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
    </div>

    <ImageCropModal v-if="cropFile" :file="cropFile" @crop="handleCropped" @cancel="cropFile = null" />
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
  color:black;
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
.modal__image-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}
.modal__checkbox {
  flex-direction: row !important;
  align-items: center;
  gap: 8px !important;
}
.modal__error {
  color: #dc2626;
  font-size: 0.85rem;
  margin: 0;
}
.modal__field-error {
  color: #dc2626;
  font-size: 0.75rem;
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}
.modal__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.modal__cancel {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
  color: #000;
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
