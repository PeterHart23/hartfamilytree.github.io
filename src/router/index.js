import { createRouter, createWebHashHistory } from 'vue-router'
import FamilyTree from '../components/FamilyTree.vue'
import { DEFAULT_TREE_ID } from '../store/treeStore'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: `/tree/${DEFAULT_TREE_ID}` },
    { path: '/tree/:slug', name: 'tree', component: FamilyTree },
    { path: '/:pathMatch(.*)*', redirect: `/tree/${DEFAULT_TREE_ID}` }
  ]
})

export default router
