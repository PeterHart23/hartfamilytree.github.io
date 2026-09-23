<script setup>
import { ref } from 'vue'
import { login } from '../store/adminAuth'

const emit = defineEmits(['close'])

const email = ref('')
const password = ref('')
const error = ref('')
const signingIn = ref(false)

async function handleSubmit() {
  signingIn.value = true
  const ok = await login(email.value, password.value)
  signingIn.value = false
  if (ok) {
    emit('close')
  } else {
    error.value = 'Invalid email or password.'
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal__header">
        <h3>Admin Sign In</h3>
        <button type="button" class="modal__close" @click="$emit('close')">×</button>
      </div>

      <form class="modal__form" @submit.prevent="handleSubmit">
        <label>
          Email
          <input v-model="email" type="email" autocomplete="username" required autofocus />
        </label>
        <label>
          Password
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>
        <p v-if="error" class="modal__error">{{ error }}</p>
        <div class="modal__actions">
          <button type="button" class="modal__cancel" @click="$emit('close')">Cancel</button>
          <button type="submit" class="modal__submit" :disabled="signingIn">{{ signingIn ? 'Signing In…' : 'Sign In' }}</button>
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
  width: min(360px, calc(100vw - 32px));
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
  color: black;
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
.modal__form input {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px;
  font-size: 0.9rem;
  font-family: inherit;
}
.modal__error {
  color: #dc2626;
  font-size: 0.85rem;
  margin: 0;
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
.modal__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
