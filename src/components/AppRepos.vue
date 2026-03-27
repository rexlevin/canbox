<template>
  <div class="app-repos-container" v-loading="loading">
    <!-- 按钮区域 -->
    <div class="button-section">
      <el-button type="primary" @click="showDialog">
        {{ $t('appRepo.addSource') }}
      </el-button>
      <div class="secondary-actions">
        <el-link type="primary" @click="importAppRepos">
          {{ $t('appRepo.importSources') }}
        </el-link>
        <el-link type="primary" @click="exportAppRepos">
          {{ $t('appRepo.exportSources') }}
        </el-link>
      </div>
    </div>

    <!-- 添加仓库对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="$t('appRepo.addSourceTitle')"
      width="600px"
      :before-close="handleClose">
      <el-form
        ref="formRef"
        :model="{ repoUrl }"
        label-width="120px"
        label-position="top"
        @submit.prevent="addAppRepo">
        <el-form-item
          :label="$t('appRepo.repoUrl')"
          prop="repoUrl"
          :rules="[
            { required: true, message: $t('appRepo.repoUrlRequired'), trigger: 'blur' },
            {
              pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
              message: $t('appRepo.repoUrlInvalid'),
              trigger: ['blur', 'change']
            }
          ]">
          <el-input
            v-model="repoUrl"
            :placeholder="$t('appRepo.repoUrlPlaceholder')"
            clearable
            @input="formRef?.clearValidate('repoUrl')"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">{{ $t('appRepo.cancel') }}</el-button>
          <el-button type="primary" @click="formRef?.validate().then(() => addAppRepo())">
            {{ $t('appRepo.confirm') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- APP列表区域 -->
    <div class="app-list-section" v-show="Object.keys(reposData).length > 0">
      <AppCard
        v-for="(repo, uid) in reposData"
        :key="uid"
        :app="{
          name: repo.name,
          version: repo.version,
          description: repo.description,
          logo: repo.logo,
          platform: repo.platform || [],
          categories: repo.categories || [],
          tags: repo.tags || [],
          author: repo.author || ''
        }"
        :uid="uid"
        :show-run="false"
        :show-clear="false"
        :show-delete="true"
        :show-copy="true"
        :show-download="!repo.downloaded"
        :show-update="repo.downloaded && repo.toUpdate"
        :show-downloaded="repo.downloaded && !repo.toUpdate"
        @show-info="showRepoInfo"
        @copy="copyRepoURL"
        @download="downloadAppsFromRepo"
        @update="downloadAppsFromRepo"
        @delete="removeRepo"
      />
    </div>

    <!-- 空状态提示 -->
    <div class="empty-section" v-show="Object.keys(reposData).length == 0">
      <p>{{ $t('appRepo.empty') }}</p>
    </div>
  </div>

  <CustomDrawer v-model="drawerInfo" :size="580">
    <div class="drawer-container">
      <div class="custom-tabs">
        <div class="custom-tabs-header">
          <div
            class="custom-tab-item"
            :class="{ active: activeTab === 0 }"
            @click="activeTab = 0">
            {{ $t('appList.appIntro') }}
          </div>
          <div
            class="custom-tab-item"
            :class="{ active: activeTab === 1 }"
            v-if="historyFlag"
            @click="activeTab = 1">
            {{ $t('appList.versionHistory') }}
          </div>
        </div>
        <div class="custom-tabs-content">
          <div class="drawer-content" v-show="activeTab === 0" id="divAppInfo" v-html="renderedReadme"></div>
          <div class="drawer-content" v-show="activeTab === 1" v-html="renderedHistory"></div>
        </div>
      </div>
    </div>
  </CustomDrawer>
</template>

<script setup>
import { onBeforeMount, ref, watch, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/appStore'
import { md } from '@/utils/markdownRenderer'
import CustomDrawer from './CustomDrawer.vue'
import AppCard from './AppCard.vue'

const appStore = useAppStore()
const { t } = useI18n()

const dialogVisible = ref(false)
const repoUrl = ref('')
const drawerInfo = ref(false)
const readme = ref(null)
const history = ref(null)
const historyFlag = ref(false)
const activeTab = ref(0)

// 控制loading状态
let loadingTag = ref({})

const showDialog = () => {
  dialogVisible.value = true
}

const handleClose = (done) => {
  repoUrl.value = ''
  done()
}

const formRef = ref()
const loading = ref(false)
let reposData = ref({})
let reposInfoData = ref({})

watch(() => appStore.removedAppId, (newAppId) => {
  if (newAppId) {
    window.api.updateReposStatus(newAppId, (result) => {
      console.log('Repos status %s updated: %o', newAppId, result)
      appStore.setRemovedAppId(null)
      fetchReposData()
    })
  }
})

onBeforeMount(() => {
  fetchReposData()
  // 监听仓库数据更新事件
  window.api.on('repo-data-updated', () => {
    fetchReposData()
  })
})

// 获取仓库列表
const fetchReposData = async () => {
  loading.value = true
  window.api.getReposData(result => {
    if (result.success) {
      // 清空对象并重新赋值，确保响应式更新
      reposData.value = result.data
      // 并行获取每个仓库的详细信息
      const promises = Object.keys(result.data).map(uid => {
        return new Promise((resolve) => {
          window.api.repo.info(uid, (infoResult) => {
            if (infoResult.success) {
              resolve({ uid, data: infoResult.data })
            } else {
              console.error(`获取仓库 ${uid} 信息失败:`, infoResult.msg)
              resolve(null)
            }
          })
        })
      })

      // 等待所有仓库信息加载完成
      Promise.all(promises).then(results => {
        results.forEach(item => {
          if (item && item.data) {
            reposInfoData.value[item.uid] = {
              readme: item.data.readme,
              history: item.data.history
            }
          }
        })
      })
    } else {
      ElMessage.error(result.msg || t('appRepo.fetchFailed'))
    }
    loading.value = false
  })
}

// 显示仓库信息（点击 logo 或名称时）
function showRepoInfo(uid) {
  const repoInfo = reposInfoData.value[uid]
  if (!repoInfo) {
    console.error('仓库信息不存在:', uid)
    return
  }

  // 设置 readme 和 history
  readme.value = repoInfo.readme || ''
  history.value = repoInfo.history || ''
  historyFlag.value = !!repoInfo.history

  // 打开 drawer
  drawerInfo.value = true
}

// 渲染后的 readme HTML
const renderedReadme = computed(() => {
  if (!readme.value) return ''
  try {
    return md.render(readme.value)
  } catch (error) {
    console.error('渲染 README 失败:', error)
    return readme.value
  }
})

// 渲染后的 history HTML
const renderedHistory = computed(() => {
  if (!history.value) return ''
  try {
    return md.render(history.value)
  } catch (error) {
    console.error('渲染 HISTORY 失败:', error)
    return history.value
  }
})

// 下载仓库中的应用
const downloadAppsFromRepo = (uid) => {
  loadingTag.value[uid] = true
  window.api.downloadAppsFromRepo(uid, result => {
    console.info('downloadAppsFromRepo result: %o', result)
    if (result.success) {
      ElMessage.success(t('appRepo.downloadSuccess'))
      const appStore = useAppStore()
      appStore.triggerAppListUpdate()
      fetchReposData()   // 更新仓库列表
    } else {
      ElMessage.error(result.msg || t('appRepo.downloadFailed'))
    }
    loadingTag.value[uid] = false
  })
}

// 删除仓库
const removeRepo = (uid) => {
  window.api.removeRepo(uid, result => {
    if (result.success) {
      ElMessage.success(t('appRepo.removeSuccess'))
      fetchReposData()
    } else {
      ElMessage.error(result.msg || t('appRepo.removeFailed'))
    }
  })
}

// 添加app源
const addAppRepo = async () => {
  loading.value = true

  // 验证表单
  await formRef.value?.validate()

  dialogVisible.value = false

  // 调用IPC接口
  window.api.addAppRepo(repoUrl.value, result => {
    if (result.success) {
      ElMessage.success(t('appRepo.addSuccess'))
      dialogVisible.value = false
      repoUrl.value = ''
      fetchReposData()
    } else {
      // 根据错误类型显示对应的国际化消息
      let errorMsg = result.msg || t('appRepo.addFailed')
      const errorKey = {
        'NoGitRepo': 'noGitRepo',
        'InvalidGitRepo': 'invalidGitRepo',
        'UnableToAccessRepo': 'unableToAccessRepo',
        'NetworkTimeout': 'networkTimeout',
        'CannotDownloadAppJson': 'cannotDownloadAppJson'
      }[errorMsg]

      if (errorKey) {
        errorMsg = t(`appRepo.${errorKey}`)
      }
      ElMessage.error(errorMsg)
    }
    loading.value = false
  })
}

const importAppRepos = () => {
  window.api.importAppRepos(ret => {
    console.log('importAppRepos ret: %o', ret)
    if (ret.success && ret.msg === 'NoFileSelected') {
      // 用户取消操作，不显示任何提示
      return
    } else if (!ret.success && 'Invalid JSON format' === ret.msg) {
      ElMessage({
        type: 'error',
        message: t('appRepo.invalidJson')
      })
    } else if (!ret.success && 'Invalid format: expected an array of repos' === ret.msg) {
      ElMessage({
        type: 'error',
        message: t('appRepo.invalidFormat')
      })
    } else if (!ret.success) {
      ElMessage({
        type: 'error',
        message: t('appRepo.importFailedPrefix') + ret.msg
      })
    } else {
      const { successCount, failedRepos, skippedCount } = ret.data || {}
      const failedCount = failedRepos ? failedRepos.length : 0
      if (failedCount > 0 || skippedCount > 0) {
        let message = t('appRepo.importSuccessMsg', { count: successCount })
        if (skippedCount > 0) {
          message = t('appRepo.importSuccessWithSkipped', { success: successCount, skipped: skippedCount })
        }
        if (failedCount > 0) {
          message = t('appRepo.importSuccessWithFailed', { success: successCount, failed: failedCount })
        }
        ElMessage({
          type: failedCount > 0 ? 'warning' : 'success',
          message
        })
      } else {
        ElMessage({
          type: 'success',
          message: t('appRepo.importSuccessAll', { success: successCount })
        })
      }
    }
  })
}

const exportAppRepos = () => {
  window.api.exportReposData(ret => {
    console.log('exportAppRepos ret: %s', JSON.stringify(ret))
    if (!ret.success) {
      ElMessage({
        type: 'error',
        message: t('appRepo.exportFailed') + ret.msg
      })
    } else if (ret.msg === '已取消导出') {
      // 用户取消操作，不显示任何提示
      return
    } else {
      ElMessage({
        type: 'success',
        message: t('appRepo.exportSuccess')
      })
    }
  })
}

// 复制仓库 URL 到剪贴板
const copyRepoURL = (uid) => {
  const repo = reposData.value[uid]
  if (repo && repo.repo) {
    navigator.clipboard.writeText(repo.repo).then(() => {
      ElMessage.success(t('appRepo.copySuccess'))
    }).catch(() => {
      ElMessage.error(t('appRepo.copyFailed'))
    })
  }
}

onMounted(() => {
  // 拦截app介绍中的a标签链接跳转，使其使用外部浏览器打开
  const links = document.querySelectorAll('#divAppInfo a[href]')
  links.forEach(link => {
    link.addEventListener('click', e => {
      const url = link.getAttribute('href')
      e.preventDefault()
      window.api.openUrl(url)
    })
  })
})
</script>

<style scoped>
.app-repos-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0 6px;
}

/* 按钮区域 */
.button-section {
  height: 60px;
  padding: 10px 8px;
  line-height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 次要操作链接 */
.secondary-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

/* APP列表区域 - 响应式网格布局 */
.app-list-section {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(520px, 1fr));
  gap: 12px;
  align-content: start;
}

/* 当窗口较窄时，单列显示 */
@media (max-width: 560px) {
  .app-list-section {
    grid-template-columns: 1fr;
  }
}

/* 空状态 */
.empty-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #909399;
  font-size: 14px;
}



/* 抽屉样式 */
.drawer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

/* 自定义 Tabs 样式 */
.custom-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.custom-tabs-header {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
}

.custom-tab-item {
  flex: 1;
  padding: 0 20px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  color: #606266;
  transition: all 0.3s;
  user-select: none;
}

.custom-tab-item:hover {
  color: #409eff;
  background: #ecf5ff;
}

.custom-tab-item.active {
  color: #409eff;
  background: #fff;
  border-bottom: 2px solid #409eff;
  font-weight: bold;
}

.custom-tabs-content {
  flex: 1;
  overflow: hidden;
  overflow-y: auto;
}

.drawer-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  text-align: left;
  box-sizing: border-box;
}

.drawer-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.drawer-content :deep(pre) {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}

.drawer-content :deep(code) {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.drawer-content :deep(p) {
  margin: 8px 0;
  line-height: 1.6;
}

.drawer-content :deep(h1),
.drawer-content :deep(h2),
.drawer-content :deep(h3) {
  margin-top: 20px;
  margin-bottom: 10px;
  font-weight: bold;
}

.drawer-content :deep(h1) {
  font-size: 28px;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

.drawer-content :deep(h2) {
  font-size: 24px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.drawer-content :deep(h3) {
  font-size: 20px;
}

.drawer-content :deep(ul),
.drawer-content :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.drawer-content :deep(li) {
  margin: 4px 0;
}

.drawer-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.drawer-content :deep(th),
.drawer-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.drawer-content :deep(th) {
  background-color: #f5f5f5;
  font-weight: bold;
}
</style>
