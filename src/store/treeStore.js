import { reactive, ref } from 'vue'
import { supabase } from '../lib/supabaseClient'

// The tree that ships with the bundled fallback data in src/data/familyData.js.
export const DEFAULT_TREE_ID = 'hart-family'
const DEFAULT_TREE_NAME = 'Hart Family Tree'

export const trees = reactive([])
export const treesLoading = ref(true)
export const treesError = ref(null)

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'family'
  )
}

function generateTreeId(name) {
  const base = slugify(name)
  const existing = new Set(trees.map(t => t.id))
  let id = base
  let suffix = 1
  while (existing.has(id)) {
    id = `${base}-${suffix++}`
  }
  return id
}

export async function loadTrees() {
  treesLoading.value = true
  treesError.value = null
  try {
    const { data, error } = await supabase.from('family_trees').select('*').order('name')
    if (error) throw error
    trees.splice(0, trees.length, ...data)
  } catch (err) {
    console.warn('Failed to load family trees from Supabase.', err)
    treesError.value = err.message || String(err)
    if (!trees.length) trees.push({ id: DEFAULT_TREE_ID, name: DEFAULT_TREE_NAME })
  }
  treesLoading.value = false
}

loadTrees()

export async function createTree(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return null

  const id = generateTreeId(trimmed)

  const { error: treeError } = await supabase.from('family_trees').insert({ id, name: trimmed })
  if (treeError) {
    throw new Error(`Failed to create family tree: ${treeError.message}`)
  }

  const { error: personError } = await supabase.from('people').insert({
    id: `${id}-1`,
    name: 'New Person',
    tree_id: id,
    parent_ids: [],
    spouse_ids: []
  })
  if (personError) {
    // Roll back the tree row so a failed creation doesn't leave an empty, broken tree behind.
    await supabase.from('family_trees').delete().eq('id', id)
    throw new Error(`Failed to create starting person: ${personError.message}`)
  }

  trees.push({ id, name: trimmed })
  return id
}
