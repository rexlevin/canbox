import {createRouter, createWebHashHistory} from 'vue-router';

const router = createRouter({
    routes: [
        {
            path: '/',
            component: () => import('@/components/CanBox.vue')
        },
        {
            path: '/log-viewer',
            component: () => import('@/components/LogViewer.vue')
        }
    ],
    history: createWebHashHistory()
});

export default router;