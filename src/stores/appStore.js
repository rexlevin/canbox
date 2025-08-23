import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    appListUpdated: false,
  }),
  actions: {
    triggerAppListUpdate() {
      this.appListUpdated = !this.appListUpdated;
    },
  },
});