import { reactive, ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { familyMembers as defaultMembers } from '../data/familyData'
import { DEFAULT_TREE_ID } from './treeStore'

export const members = reactive([])
export const isLoading = ref(true)
export const loadError = ref(null)

// The tree currently loaded into `members`; stamped onto every person created
// from here on so multiple trees can share the same `people` table.
let activeTreeId = null

// --- Row <-> app-shape conversion -----------------------------------------
// DB uses snake_case + `date` columns; the app uses camelCase + MM/DD/YYYY text.
function isoToDisplayDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

function displayToIsoDate(value) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((value || '').trim())
  if (!match) return null
  const [, m, d, y] = match
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    birth: isoToDisplayDate(row.date_of_birth),
    death: isoToDisplayDate(row.date_of_death),
    image: row.image || '',
    notes: row.notes || '',
    spouseIds: row.spouse_ids || [],
    parentIds: row.parent_ids || [],
    treeId: row.tree_id
  }
}

function toRow(person) {
  return {
    id: person.id,
    name: person.name,
    date_of_birth: displayToIsoDate(person.birth),
    date_of_death: displayToIsoDate(person.death),
    image: person.image || '',
    notes: person.notes || '',
    spouse_ids: person.spouseIds || [],
    parent_ids: person.parentIds || [],
    tree_id: person.treeId
  }
}

// --- Initial load ----------------------------------------------------------
export async function loadMembers(treeId) {
  activeTreeId = treeId
  isLoading.value = true
  loadError.value = null
  try {
    const { data, error } = await supabase.from('people').select('*').eq('tree_id', treeId)
    if (error) throw error
    members.splice(0, members.length, ...data.map(fromRow))
  } catch (err) {
    console.warn(`Failed to load family data for "${treeId}" from Supabase.`, err)
    loadError.value = err.message || String(err)
    // The bundled fallback data only represents the original Hart family tree.
    members.splice(0, members.length, ...(treeId === DEFAULT_TREE_ID ? defaultMembers.map(m => ({ ...m, treeId })) : []))
  }
  isLoading.value = false
}

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'person'
  )
}

function generateId(name) {
  const base = `${activeTreeId}-${slugify(name)}`
  const existing = new Set(members.map(m => m.id))
  let id = base
  let suffix = 1
  while (existing.has(id)) {
    id = `${base}-${suffix++}`
  }
  return id
}

function findPerson(id) {
  return members.find(m => m.id === id)
}

function makePerson(data) {
  return {
    id: generateId(data.name),
    name: data.name.trim(),
    birth: data.birth || '',
    death: data.death || '',
    image: data.image || '',
    treeId: activeTreeId,
    spouseIds: [],
    parentIds: [],
    notes: data.notes || ''
  }
}

export async function updatePerson(id, patch) {
  const person = findPerson(id)
  if (!person) return
  const updated = { ...person, ...patch }
  const { error } = await supabase.from('people').update(toRow(updated)).eq('id', id)
  if (error) {
    throw new Error(`Failed to update person: ${error.message}`)
  }
  Object.assign(person, patch)
}

export async function addPartner(personId, data) {
  const person = findPerson(personId)
  if (!person || !data.name?.trim()) return
  const partner = makePerson(data)
  partner.spouseIds = [person.id]

  const { error: insertError } = await supabase.from('people').insert(toRow(partner))
  if (insertError) {
    throw new Error(`Failed to add partner: ${insertError.message}`)
  }
  const newSpouseIds = [...person.spouseIds, partner.id]
  const { error: updateError } = await supabase.from('people').update({ spouse_ids: newSpouseIds }).eq('id', person.id)
  if (updateError) {
    throw new Error(`Failed to link spouse: ${updateError.message}`)
  }

  members.push(partner)
  person.spouseIds = newSpouseIds
  return partner
}

export async function addSibling(personId, data) {
  const person = findPerson(personId)
  if (!person || !data.name?.trim()) return
  const sibling = makePerson(data)
  sibling.parentIds = [...person.parentIds]

  const { error } = await supabase.from('people').insert(toRow(sibling))
  if (error) {
    throw new Error(`Failed to add sibling: ${error.message}`)
  }
  members.push(sibling)
  return sibling
}

export async function addChild(personId, data, options = {}) {
  const person = findPerson(personId)
  if (!person || !data.name?.trim()) return
  const child = makePerson(data)
  child.parentIds = [person.id]
  if (options.spouseId && person.spouseIds.includes(options.spouseId)) {
    child.parentIds.push(options.spouseId)
  }

  const { error } = await supabase.from('people').insert(toRow(child))
  if (error) {
    throw new Error(`Failed to add child: ${error.message}`)
  }
  members.push(child)
  return child
}

export async function addParents(personId, parentsData) {
  const person = findPerson(personId)
  if (!person) return
  const validInputs = parentsData.filter(p => p?.name?.trim())
  if (!validInputs.length) return
  const created = validInputs.map(makePerson)
  if (created.length === 2) {
    created[0].spouseIds = [created[1].id]
    created[1].spouseIds = [created[0].id]
  }

  const { error: insertError } = await supabase.from('people').insert(created.map(toRow))
  if (insertError) {
    throw new Error(`Failed to add parents: ${insertError.message}`)
  }
  const newParentIds = [...new Set([...person.parentIds, ...created.map(p => p.id)])]
  const { error: updateError } = await supabase.from('people').update({ parent_ids: newParentIds }).eq('id', person.id)
  if (updateError) {
    throw new Error(`Failed to link parents: ${updateError.message}`)
  }

  members.push(...created)
  person.parentIds = newParentIds
  return created
}

export async function deletePerson(id) {
  const person = findPerson(id)
  if (!person) return

  // Supabase silently deletes 0 rows (no error) when RLS blocks the delete,
  // so request the deleted rows back to detect that case explicitly.
  const { data, error } = await supabase.from('people').delete().eq('id', id).select()
  if (error) {
    throw new Error(`Failed to delete person: ${error.message}`)
  }
  if (!data || data.length === 0) {
    throw new Error('Delete was blocked by the database (check the delete RLS policy on the people table).')
  }

  // Clean up references left dangling on other members, persisting each
  // change so stale ids don't linger in the DB (e.g. resurfacing later if a
  // new person happens to reuse the deleted id).
  const affected = members.filter(m => m.spouseIds.includes(id) || m.parentIds.includes(id))
  await Promise.all(
    affected.map(async m => {
      const spouseIds = m.spouseIds.filter(sid => sid !== id)
      const parentIds = m.parentIds.filter(pid => pid !== id)
      const { error: cleanupError } = await supabase
        .from('people')
        .update({ spouse_ids: spouseIds, parent_ids: parentIds })
        .eq('id', m.id)
      if (cleanupError) {
        console.error(`Failed to clean up references to ${id} on ${m.id}: ${cleanupError.message}`)
        return
      }
      m.spouseIds = spouseIds
      m.parentIds = parentIds
    })
  )

  const index = members.findIndex(m => m.id === id)
  if (index !== -1) members.splice(index, 1)
}