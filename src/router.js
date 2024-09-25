import {createRouter, createWebHashHistory} from 'vue-router';

const router = createRouter({
    routes: [
        {
            path: '/',
            component: () => import('./components/CanBox.vue')
        }
    ],
    history: createWebHashHistory()
});

export default router;