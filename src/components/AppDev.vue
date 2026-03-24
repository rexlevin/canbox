<template>
  <div class="app-dev-new-container">
    <!-- 按钮区域 -->
    <div class="button-section">
      <el-button type="primary" @click="addAppDev">
        {{ $t('devApp.addApp') }}
      </el-button>
    </div>

    <!-- APP列表区域 -->
    <div class="app-list-section" v-show="Object.keys(appDevData).length > 0">
      <AppCard
        v-for="(appDevItem, uid) in appDevData"
        :key="uid"
        :app="{
          name: appDevItem.appJson.name,
          version: appDevItem.appJson.version,
          description: appDevItem.appJson.description,
          logo: appDevItem.path + '/' + appDevItem.appJson.logo,
          platform: appDevItem.appJson.platform || [],
          categories: appDevItem.appJson.categories || [],
          tags: appDevItem.appJson.tags || [],
          author: appDevItem.appJson.author || ''
        }"
        :uid="uid"
        :show-pack="true"
        :show-run="true"
        :show-clear="true"
        :show-delete="true"
        @pack="packApp"
        @run="loadApp"
        @clear="clearData"
        @delete="removeApp"
        @show-info="showAppDevInfo"
      />
    </div>

    <!-- 空状态提示 -->
    <div class="empty-section" v-show="Object.keys(appDevData).length == 0">
      <p>{{ $t('devApp.empty') }}</p>
    </div>

    <!-- 文档链接 -->
    <div class="doc-links">
      <el-link type="primary" @click="openAppDevDoc">{{ $t('devApp.viewDevDoc') }}</el-link>
      <el-link type="primary" @click="openApiDoc">{{ $t('devApp.viewApiDoc') }}</el-link>
      <el-link type="primary" @click="downloadCanboxTS">{{ $t('devApp.downloadCanboxTypes') }}</el-link>
    </div>

    <!-- 警告对话框 -->
    <el-dialog v-model="centerDialogVisible" :title="$t('devApp.warningTitle')" width="300" center>
      <span style="white-space:pre-line">{{ warningContent }}</span>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="centerDialogVisible = false"> {{ $t('devApp.confirm') }} </el-button>
        </div>
      </template>
    </el-dialog>
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
import { onBeforeMount, onUpdated, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { renderAndOpenMarkdown } from '../utils/markdownRenderer'
import { md } from '@/utils/markdownRenderer'
import CustomDrawer from './CustomDrawer.vue'
import AppCard from './AppCard.vue'

const { t } = useI18n()
const activeTab = ref(0)

let appDevData = ref({})
const centerDialogVisible = ref(false)
const warningContent = ref('')
const drawerInfo = ref(false)
const readme = ref(null)
const history = ref(null)
const historyFlag = ref(false)
let appDevInfoData = ref({})

/**
 * 并行获取所有开发应用的详细信息（readme/history）
 */
function fetchAppDevDetails(apps) {
  const promises = Object.keys(apps).map(uid => {
    return new Promise((resolve) => {
      window.api.appDev.info(uid, (infoResult) => {
        if (infoResult.success) {
          resolve({ uid, data: infoResult.data })
        } else {
          console.error(`获取开发应用 ${uid} 信息失败:`, infoResult.msg)
          resolve(null)
        }
      })
    })
  })

  Promise.all(promises).then(results => {
    results.forEach(item => {
      if (item && item.data) {
        appDevInfoData.value[item.uid] = {
          readme: item.data.readme,
          history: item.data.history
        }
      }
    })
  })
}

function addAppDev() {
  window.api.appDev.add((result) => {
    if (result?.correct && Object.keys(result.correct).length > 0) {
      // 只在有应用数据时才更新（避免用户取消时清空列表）
      appDevData.value = result.correct
      // 并行获取详细信息
      fetchAppDevDetails(result.correct)
    }
    // 如果用户取消或返回空数据，不更新列表
  })
}

// 控制打包按钮的loading状态
let exportAppFlag = ref({})
// 打包app
async function packApp(uid) {
  exportAppFlag.value[uid] = true
  const result = window.api.packToAsar(uid)
  result.then((result) => {
    if (!result.success) {
      ElMessage({
        type: 'error',
        message: result.msg,
      })
      return
    }
    ElMessage({
      message: t('devApp.packSuccess'),
      type: 'success',
    })
  }).catch((err) => {
    ElMessage({
      type: 'error',
      message: err,
    })
  }).finally(() => {
    exportAppFlag.value[uid] = false
  })
}

// 运行app
function loadApp(uid) {
  window.api.app.load(uid, true)
}

// 清除app运行数据
function clearData(uid) {
  window.api.app.clearData(uid, (result) => {
    console.info('clearData result=', result)
    if (!result.success) {
      ElMessage.error(result.msg)
      return
    }
    ElMessage({
      message: t('devApp.clearDataSuccess'),
      type: 'success'
    })
  })
}

function removeApp(uid) {
  window.api.app.remove({
    id: uid,
    devTag: true
  }, (result) => {
    console.info('remove result=', result)
    if (!result.success) {
      ElMessage.error(result.msg)
      return
    }
    ElMessage({
      message: t('devApp.removeSuccess'),
      type: 'success'
    })
    load()
  })
}

function load() {
  window.api.appDev.all((result) => {
    // 支持新格式 { success: true, data: appDevData, wrong: appDevFalseData }
    // 兼容旧格式 { correct: appDevData, wrong: appDevFalseData }
    if (result && result.success) {
      appDevData.value = result.data || {}
    } else if (result && result.correct) {
      appDevData.value = result.correct || {}
    } else {
      appDevData.value = {}
    }

    const wrongApps = result?.wrong || {}
    if (wrongApps && Object.keys(wrongApps).length > 0) {
      warningContent.value = `以下 app.json 存在问题，已经移除： \n ${Object.entries(wrongApps).map(([key, item]) => item.name || key).join('\n')}`
      centerDialogVisible.value = true
    }

    // 并行获取每个开发应用的详细信息
    if (result && (result.data || result.correct)) {
      const dataToProcess = result.data || result.correct || {}
      fetchAppDevDetails(dataToProcess)
    }
  })
}

// 显示开发应用信息（点击 logo 或名称时）
function showAppDevInfo(uid) {
  const appInfo = appDevInfoData.value[uid]
  if (!appInfo) {
    console.error('开发应用信息不存在:', uid)
    return
  }

  // 设置 readme 和 history
  readme.value = appInfo.readme || ''
  history.value = appInfo.history || ''
  historyFlag.value = !!appInfo.history

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

// 打开APP开发文档
async function openAppDevDoc() {
  await renderAndOpenMarkdown('docs/APP_DEV_CN.md', 'APP 开发文档', { maxContentWidth: 1100 })
}

// 打开API文档
async function openApiDoc() {
  await renderAndOpenMarkdown('docs/API_CN.md', 'API 文档')
}

// 下载 canbox.d.ts 类型定义文件
async function downloadCanboxTS() {
  try {
    const result = await window.api.downloadCanboxTypes()

    if (!result.success) {
      ElMessage.error(t('devApp.downloadFailed') + result.msg)
      return
    }

    // 用户取消操作，不显示任何提示
    if (result.msg === 'canceled') {
      return
    }

    ElMessage.success(t('devApp.downloadSuccess'))
  } catch (error) {
    console.error('下载 canbox.d.ts 失败:', error)
    ElMessage.error(t('devApp.downloadFailed') + error.message)
  }
}

onBeforeMount(() => {
  load()
})

onUpdated(() => {
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
.app-dev-new-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0 6px;
}

/* 按钮区域 */
.button-section {
  height: 60px;
  padding: 10px 0;
  line-height: 60px;
  flex-shrink: 0;
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

/* 文档链接 */
.doc-links {
  position: absolute;
  bottom: 0;
  width: 100%;
  text-align: center;
  padding: 10px 0;
  border-top: 1px solid #eee;
  background: #fff;
}

.doc-links .el-link {
  margin-right: 20px;
}

.doc-links .el-link:last-child {
  margin-right: 0;
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
