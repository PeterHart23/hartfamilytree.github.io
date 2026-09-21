<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  file: {
    type: File,
    required: true
  }
})

const emit = defineEmits(['crop', 'cancel'])

const VIEWPORT = 240
const OUTPUT_SIZE = 480

const imageUrl = ref('')
const imgRef = ref(null)
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const cropping = ref(false)

const baseScale = computed(() =>
  naturalWidth.value && naturalHeight.value ? VIEWPORT / Math.min(naturalWidth.value, naturalHeight.value) : 1
)
const scale = computed(() => baseScale.value * zoom.value)
const displayedWidth = computed(() => naturalWidth.value * scale.value)
const displayedHeight = computed(() => naturalHeight.value * scale.value)

onMounted(() => {
  imageUrl.value = URL.createObjectURL(props.file)
})

onBeforeUnmount(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function setOffset(x, y) {
  const minX = Math.min(VIEWPORT - displayedWidth.value, 0)
  const minY = Math.min(VIEWPORT - displayedHeight.value, 0)
  offsetX.value = clamp(x, minX, 0)
  offsetY.value = clamp(y, minY, 0)
}

function onImageLoad() {
  naturalWidth.value = imgRef.value.naturalWidth
  naturalHeight.value = imgRef.value.naturalHeight
  nextTick(() => {
    setOffset((VIEWPORT - displayedWidth.value) / 2, (VIEWPORT - displayedHeight.value) / 2)
  })
}

// Keep the viewport's center point fixed on the image while the zoom level changes.
function onZoomInput() {
  nextTick(() => {
    setOffset(offsetX.value, offsetY.value)
  })
}

const isDragging = ref(false)
const dragStart = { x: 0, y: 0 }
const offsetStart = { x: 0, y: 0 }

function onPointerDown(event) {
  isDragging.value = true
  dragStart.x = event.clientX
  dragStart.y = event.clientY
  offsetStart.x = offsetX.value
  offsetStart.y = offsetY.value
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event) {
  if (!isDragging.value) return
  setOffset(offsetStart.x + (event.clientX - dragStart.x), offsetStart.y + (event.clientY - dragStart.y))
}

function onPointerUp() {
  isDragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})

function applyCrop() {
  cropping.value = true
  const sSize = VIEWPORT / scale.value
  const sx = -offsetX.value / scale.value
  const sy = -offsetY.value / scale.value

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imgRef.value, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  canvas.toBlob(
    blob => {
      cropping.value = false
      if (blob) emit('crop', blob)
    },
    'image/jpeg',
    0.9
  )
}
</script>

<template>
  <div class="crop-overlay">
    <div class="crop-modal">
      <h3>Crop image</h3>
      <div
        class="crop-viewport"
        :class="{ 'is-dragging': isDragging }"
        @pointerdown="onPointerDown"
      >
        <img
          ref="imgRef"
          :src="imageUrl"
          alt="Image to crop"
          draggable="false"
          :style="{ width: displayedWidth + 'px', height: displayedHeight + 'px', left: offsetX + 'px', top: offsetY + 'px' }"
          @load="onImageLoad"
        />
      </div>

      <input
        class="crop-zoom"
        type="range"
        min="1"
        max="3"
        step="0.01"
        v-model.number="zoom"
        @input="onZoomInput"
      />

      <div class="crop-actions">
        <button type="button" class="crop-cancel" @click="$emit('cancel')">Cancel</button>
        <button type="button" class="crop-apply" :disabled="cropping" @click="applyCrop">
          {{ cropping ? 'Cropping…' : 'Apply Crop' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.crop-modal {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  width: min(320px, calc(100vw - 32px));
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  text-align: center;
}
.crop-modal h3 {
  margin: 0 0 14px;
  font-size: 1rem;
}
.crop-viewport {
  position: relative;
  width: 240px;
  height: 240px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 50%;
  background: #f3f4f6;
  cursor: grab;
  touch-action: none;
}
.crop-viewport.is-dragging {
  cursor: grabbing;
}
.crop-viewport img {
  position: absolute;
  user-select: none;
  pointer-events: none;
}
.crop-zoom {
  width: 100%;
  margin-top: 16px;
}
.crop-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}
.crop-cancel {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
  color:black
}
.crop-apply {
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
  padding: 8px 14px;
  font-weight: 600;
  cursor: pointer;
}
.crop-apply:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
