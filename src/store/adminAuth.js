import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'

// Admin gating now relies on a real Supabase Auth session so it also
// satisfies the "authenticated" RLS policies on the people table.
export const isAdmin = ref(false)

supabase.auth.getSession().then(({ data }) => {
  isAdmin.value = !!data.session
})

supabase.auth.onAuthStateChange((_event, session) => {
  isAdmin.value = !!session
})

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return !error
}

export async function logout() {
  await supabase.auth.signOut()
}
