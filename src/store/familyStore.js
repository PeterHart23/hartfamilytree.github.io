import { reactive } from 'vue'
import { familyMembers as defaultMembers } from '../data/familyData'

// Edits are kept in-browser only (localStorage), since this is a static
// site with no backend. Use exportMembersJson() to copy the result back
// into src/data/familyData.js so changes persist for every visitor.
const STORAGE_KEY = 'hartFamilyTree.members'

function loadInitialMembers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (err) {
    console.warn('Failed to load saved family data, falling back to defaults.', err)
  }
  return defaultMembers.map(member => ({ ...member }))
}

export const members = reactive(loadInitialMembers())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members))
  } catch (err) {
    console.warn('Failed to save family data locally.', err)
  }
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
  const base = slugify(name)
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
    spouseId: null,
    parentIds: [],
    notes: data.notes || ''
  }
}

export function updatePerson(id, patch) {
  const person = findPerson(id)
  if (!person) return
  Object.assign(person, patch)
  persist()
}

export function addPartner(personId, data) {
  const person = findPerson(personId)
  if (!person || !data.name?.trim()) return
  const partner = makePerson(data)
  partner.spouseId = person.id
  members.push(partner)
  person.spouseId = partner.id
  persist()
  return partner
}

export function addSibling(personId, data) {
  const person = findPerson(personId)
  if (!person || !data.name?.trim()) return
  const sibling = makePerson(data)
  sibling.parentIds = [...person.parentIds]
  members.push(sibling)
  persist()
  return sibling
}

export function addChild(personId, data, options = {}) {
  const person = findPerson(personId)
  if (!person || !data.name?.trim()) return
  const child = makePerson(data)
  child.parentIds = [person.id]
  if (options.includeSpouse && person.spouseId) {
    child.parentIds.push(person.spouseId)
  }
  members.push(child)
  persist()
  return child
}

export function addParents(personId, parentsData) {
  const person = findPerson(personId)
  if (!person) return
  const validInputs = parentsData.filter(p => p?.name?.trim())
  if (!validInputs.length) return
  const created = validInputs.map(makePerson)
  if (created.length === 2) {
    created[0].spouseId = created[1].id
    created[1].spouseId = created[0].id
  }
  members.push(...created)
  person.parentIds = [...new Set([...person.parentIds, ...created.map(p => p.id)])]
  persist()
  return created
}

export function exportMembersJson() {
  return JSON.stringify(members, null, 2)
}

export function hasLocalChanges() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function resetLocalChanges() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.warn('Failed to clear saved family data.', err)
  }
  members.splice(0, members.length, ...defaultMembers.map(m => ({ ...m })))
}
