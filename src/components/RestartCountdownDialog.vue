<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('settings.restartCountdown', { count: countdown })"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    width="400px"
    center
  >
    <div class="countdown-content">
      <!-- 倒计时文本 -->
      <div class="countdown-text">
        {{ $t('settings.restartCountdown', { count: countdown }) }}
      </div>

      <!-- 手动启动提示（所有情况统一显示） -->
      <div class="manual-hint">
        {{ $t('settings.manualRestartHint') }}
      </div>

      <!-- 立刻重启按钮 -->
      <div class="button-row">
        <el-button type="primary" @click="restartNow">
          {{ $t('settings.restartNow') }}
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'RestartCountdownDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    isAppImage: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:visible', 'restart-now'],
  data() {
    return {
      dialogVisible: this.visible,
      countdown: 5,
      timer: null
    };
  },
  watch: {
    visible(newVal) {
      this.dialogVisible = newVal;
      if (newVal) {
        this.startCountdown();
      } else {
        this.stopCountdown();
      }
    }
  },
  methods: {
    startCountdown() {
      this.countdown = 5;
      this.timer = setInterval(() => {
        this.countdown--;
        if (this.countdown <= 0) {
          this.stopCountdown();
          this.$emit('restart-now');
        }
      }, 1000);
    },
    stopCountdown() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    restartNow() {
      this.stopCountdown();
      this.$emit('restart-now');
    }
  },
  beforeUnmount() {
    this.stopCountdown();
  }
};
</script>

<style scoped>
.countdown-content {
  text-align: center;
  padding: 20px 0;
}

.countdown-text {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 20px;
}

.manual-hint {
  font-size: 14px;
  font-weight: 600;
  color: #E6A23C;
  margin-bottom: 24px;
  padding: 12px;
  background-color: #FEF0F0;
  border-radius: 4px;
}

.button-row {
  display: flex;
  justify-content: center;
}
</style>
