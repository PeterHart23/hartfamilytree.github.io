import { ref } from 'vue'

// Hardcoded credentials — acceptable here since this is a low-stakes personal project.
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'harttree'

export const isAdmin = ref(false)

export function login(username, password) {
  const ok = username === ADMIN_USERNAME && password === ADMIN_PASSWORD
  if (ok) isAdmin.value = true
  return ok
}

export function logout() {
  isAdmin.value = false
}
