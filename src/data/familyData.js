export const familyMembers = [
  // Patriarch & Matriarch
  {
    id: 'ron',
    name: 'Ron Hart',
    birth: '',
    spouseIds: ['jan'],
    parentIds: [],
    notes: 'Patriarch of the Hart family.'
  },
  {
    id: 'jan',
    name: 'Jan Hart',
    birth: '',
    spouseIds: ['ron'],
    parentIds: [],
    notes: 'Matriarch of the Hart family.'
  },

  // Their children (5)
  {
    id: 'sarah',
    name: 'Sarah Hart Greene',
    birth: '04/13/1989',
    spouseIds: ['jessie'],
    parentIds: ['ron', 'jan'],
    notes: 'Oldest child of Ron and Jan.'
  },
  {
    id: 'laura',
    name: 'Laura Hart Telepak',
    birth: '09/29/1990',
    spouseIds: ['john'],
    parentIds: ['ron', 'jan'],
    notes: 'Second child of Ron and Jan.'
  },
  {
    id: 'amy',
    name: 'Amy Lianna Hart',
    birth: '03/23/1992',
    spouseIds: [],
    parentIds: ['ron', 'jan'],
    notes: 'Third child of Ron and Jan.'
  },
  {
    id: 'tim',
    name: 'Timothy Ronald Hart',
    birth: '06/19/1995',
    spouseIds: ['ashley'],
    parentIds: ['ron', 'jan'],
    notes: 'Fourth child of Ron and Jan.'
  },
  {
    id: 'peter',
    name: 'Peter James Hart',
    birth: '05/01/1999',
    spouseIds: ['hayley'],
    parentIds: ['ron', 'jan'],
    notes: 'Youngest child of Ron and Jan.'
  },

  // Spouses of children
  {
    id: 'jessie',
    name: 'Jessie Caleb Greene',
    birth: '',
    spouseIds: ['sarah'],
    parentIds: [],
    notes: 'Spouse of Sarah.'
  },
  {
    id: 'john',
    name: 'John Telepak',
    birth: '',
    spouseIds: ['laura'],
    parentIds: [],
    notes: 'Spouse of Laura.'
  },
  {
    id: 'ashley',
    name: 'Ashley Henderson Hart',
    birth: '',
    spouseIds: ['tim'],
    parentIds: [],
    notes: 'Spouse of Tim.'
  },
  {
    id: 'hayley',
    name: 'Hayley Ann Venman Hart',
    birth: '',
    spouseIds: ['peter'],
    parentIds: [],
    notes: 'Spouse of Peter.'
  },

  // Grandchildren: Sarah + Jessie (4)
  {
    id: 'roman',
    name: 'Roman Greene',
    birth: '',
    spouseIds: [],
    parentIds: ['sarah', 'jessie'],
    notes: ''
  },
  {
    id: 'ella',
    name: 'Eleanor Greene',
    birth: '',
    spouseIds: [],
    parentIds: ['sarah', 'jessie'],
    notes: ''
  },
  {
    id: 'penelope',
    name: 'Penelope Greene',
    birth: '',
    spouseIds: [],
    parentIds: ['sarah', 'jessie'],
    notes: ''
  },
  {
    id: 'genevieve',
    name: 'Genevieve Greene',
    birth: '',
    spouseIds: [],
    parentIds: ['sarah', 'jessie'],
    notes: ''
  },

  // Grandchildren: Laura + John (2)
  {
    id: 'archer',
    name: 'Archer Edward Telepak',
    birth: '',
    spouseIds: [],
    parentIds: ['laura', 'john'],
    notes: ''
  },
  {
    id: 'george',
    name: 'George Albert Telepak',
    birth: '',
    spouseIds: [],
    parentIds: ['laura', 'john'],
    notes: ''
  }
]
