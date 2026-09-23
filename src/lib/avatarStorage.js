import { supabase } from './supabaseClient'

// crypto.randomUUID only exists in secure contexts on newer browsers (e.g.
// missing on older iOS Safari, or if the site is ever loaded over plain HTTP),
// so fall back to a plain random string for the upload filename.
function generateUploadId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

// Only matches URLs generated via the avatars bucket, so pasted external URLs are left alone.
export function avatarPathFromUrl(url) {
  const marker = '/avatars/'
  const idx = (url || '').indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}

export async function uploadAvatar(file, ext) {
  const extension = ext || file.name?.split('.').pop() || 'jpg'
  const path = `${generateUploadId()}.${extension}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    contentType: file.type || 'image/jpeg'
  })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return { path, url: data.publicUrl }
}

export async function deleteAvatar(path) {
  if (!path) return
  const { error } = await supabase.storage.from('avatars').remove([path])
  if (error) console.warn('Failed to remove avatar:', error.message)
}
