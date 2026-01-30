<template>
  <transition name="drawer-fade">
    <div v-if="modelValue" class="custom-drawer-overlay" @click="handleOverlayClick">
      <transition name="drawer-slide">
        <div v-if="modelValue" class="custom-drawer" :style="{ width: size + 'px' }" @click.stop>
          <slot></slot>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  size: {
    type: Number,
    default: 580
  },
  closeOnClickOverlay: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

function handleOverlayClick() {
  if (props.closeOnClickOverlay) {
    emit('update:modelValue', false);
    emit('close');
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape' && props.modelValue) {
    emit('update:modelValue', false);
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.custom-drawer-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2000;
}

.custom-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: #fff;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>
