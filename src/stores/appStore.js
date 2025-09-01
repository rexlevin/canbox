import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
    state: () => ({
        appListUpdated: false,
        removedAppId: null,
    }),
    actions: {
        triggerAppListUpdate() {
            this.appListUpdated = !this.appListUpdated;
        },
        setRemovedAppId(appId) {
            this.removedAppId = appId;
        },
        getRemovedAppId() {
            return this.removedAppId;
        },
    },
});