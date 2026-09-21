import { supabase } from './supabaseClient'

// Only matches URLs generated via the avatars bucket, so pasted external URLs are left alone.
export function avatarPathFromUrl(url) {
  const marker = '/avatars/'
  const idx = (url || '').indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}

export async function uploadAvatar(file, ext) {
  const extension = ext || file.name?.split('.').pop() || 'jpg'
  const path = `${crypto.randomUUID()}.${extension}`
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
