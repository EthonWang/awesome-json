<script setup>
import { ref, computed, nextTick } from 'vue'
import JsonEditor from '@/components/JsonEditor.vue'

const tipShow = ref(false)
const tipMsg = ref('')

let tabIdCounter = 1
const tabs = ref([{ id: tabIdCounter, title: 'Tab 1', content: '', error: '' }])
const activeTabId = ref(1)
const editorRefs = ref({})
const tabItemsRef = ref(null)

function onTabWheel(e) {
  if (tabItemsRef.value) {
    tabItemsRef.value.scrollLeft += e.deltaY || e.deltaX
  }
}

const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value))

function setEditorRef(id, el) {
  if (el) {
    editorRefs.value[id] = el
  } else {
    delete editorRefs.value[id]
  }
}

function getActiveEditor() {
  return editorRefs.value[activeTabId.value]
}

function addTab() {
  tabIdCounter++
  const newTab = { id: tabIdCounter, title: `Tab ${tabIdCounter}`, content: '', error: '' }
  tabs.value.push(newTab)
  activeTabId.value = newTab.id
}

function closeTab(id, e) {
  e.stopPropagation()
  if (tabs.value.length <= 1) return
  const idx = tabs.value.findIndex(t => t.id === id)
  tabs.value.splice(idx, 1)
  delete editorRefs.value[id]
  if (activeTabId.value === id) {
    activeTabId.value = tabs.value[Math.min(idx, tabs.value.length - 1)].id
  }
}

function onTabError(id, msg) {
  const tab = tabs.value.find(t => t.id === id)
  if (tab) tab.error = msg
}

const autoFormat = ref(true)

function formatJson() {
  const editor = getActiveEditor()
  if (editor) {
    editor.formatJson()
    if (activeTab.value?.error) {
      tipMsg.value = 'JSON 格式错误: ' + activeTab.value.error
      tipShow.value = true
    }
  }
}

function compressJson() {
  const editor = getActiveEditor()
  if (editor) {
    editor.compressJson()
    if (activeTab.value?.error) {
      tipMsg.value = 'JSON 格式错误: ' + activeTab.value.error
      tipShow.value = true
    }
  }
}

function validateJson() {
  const editor = getActiveEditor()
  if (editor) {
    editor.validateJson()
    nextTick(() => {
      if (activeTab.value?.error) {
        tipMsg.value = 'JSON 格式错误: ' + activeTab.value.error
      } else {
        tipMsg.value = 'JSON 合法'
      }
      tipShow.value = true
    })
  }
}

function copyJson() {
  const editor = getActiveEditor()
  if (editor) {
    editor.copyJson().then(() => {
      tipMsg.value = '已复制到剪贴板'
      tipShow.value = true
    })
  }
}

function clearAll() {
  const editor = getActiveEditor()
  if (editor) editor.clearAll()
}

function removeEscaping() {
  const editor = getActiveEditor()
  if (editor) editor.removeEscaping()
}

function addEscaping() {
  const editor = getActiveEditor()
  if (editor) editor.addEscaping()
}
</script>

<template>
  <v-main class="ma-4">
    <v-card variant="outlined" class="editor-card">
      <!-- Tab 栏 - VS Code 风格 -->
      <div class="tab-bar d-flex align-center">
        <div class="tab-items d-flex align-center" ref="tabItemsRef" @wheel.prevent="onTabWheel">
          <div v-for="tab in tabs" :key="tab.id"
            class="tab-item d-flex align-center px-3"
            :class="{ 'tab-active': tab.id === activeTabId }"
            @click="activeTabId = tab.id">
            <v-icon size="14" class="mr-1" :color="tab.error ? 'error' : 'grey'">
              {{ tab.error ? 'mdi-alert-circle' : 'mdi-code-json' }}
            </v-icon>
            <span class="tab-title text-caption">{{ tab.title }}</span>
            <v-icon v-if="tabs.length > 1" size="14" class="tab-close ml-2"
              @click="closeTab(tab.id, $event)">mdi-close</v-icon>
          </div>
          <div class="tab-add d-flex align-center justify-center" @click="addTab">
            <v-icon size="16">mdi-plus</v-icon>
          </div>
        </div>
      </div>

      <!-- 工具栏 - 在 tab 内容区内部 -->
      <div class="toolbar d-flex align-center flex-wrap px-3 py-2">
        <v-tooltip text="检测到文本变化会触发自动格式化" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" class="mr-1" size="small" variant="tonal" density="comfortable"
              :color="autoFormat ? 'indigo-darken-3' : undefined"
              @click="autoFormat = !autoFormat"
              prepend-icon="mdi-auto-fix">
              {{ autoFormat ? '关闭自动格式化' : '自动格式化' }}
            </v-btn>
          </template>
        </v-tooltip>
        <v-divider vertical class="mx-2" style="height: 24px;" />
        <v-btn class="mr-1" size="small" variant="text" density="comfortable" @click="formatJson" prepend-icon="mdi-code-braces">格式化</v-btn>
        <v-btn class="mr-1" size="small" variant="text" density="comfortable" @click="compressJson" prepend-icon="mdi-arrow-collapse-horizontal">压缩</v-btn>
        <v-btn class="mr-1" size="small" variant="text" density="comfortable" @click="validateJson" prepend-icon="mdi-check-circle-outline">校验</v-btn>
        <v-divider vertical class="mx-2" style="height: 24px;" />
        <v-btn class="mr-1" size="small" variant="text" density="comfortable" @click="removeEscaping" prepend-icon="mdi-format-clear">去转义</v-btn>
        <v-btn class="mr-1" size="small" variant="text" density="comfortable" @click="addEscaping" prepend-icon="mdi-code-string">转义</v-btn>
        <v-divider vertical class="mx-2" style="height: 24px;" />
        <v-btn class="mr-1" size="small" variant="text" density="comfortable" @click="copyJson" prepend-icon="mdi-content-copy">复制</v-btn>
        <v-btn size="small" variant="text" density="comfortable" color="error" @click="clearAll" prepend-icon="mdi-delete-outline">清空</v-btn>

        <v-spacer />

        <v-chip v-if="activeTab?.error" color="error" variant="tonal" size="x-small" prepend-icon="mdi-alert-circle" class="ml-2">
          {{ activeTab.error }}
        </v-chip>
        <v-chip v-else-if="activeTab?.content?.trim()" color="success" variant="tonal" size="x-small" prepend-icon="mdi-check-circle" class="ml-2">
          JSON 合法
        </v-chip>
      </div>

      <v-divider />

      <!-- 编辑器区域 -->
      <div class="editor-area">
        <template v-for="tab in tabs" :key="tab.id">
          <JsonEditor
            v-show="tab.id === activeTabId"
            :ref="(el) => setEditorRef(tab.id, el)"
            v-model="tab.content"
            :auto-format="autoFormat"
            @error="(msg) => onTabError(tab.id, msg)"
            style="height: 100%;"
          />
        </template>
      </div>

      <!-- 底部状态栏 -->
      <div class="status-bar d-flex align-center px-3">
        <span class="text-caption text-medium-emphasis">
          {{ tabs.length }} 个标签页
        </span>
        <v-spacer />
        <span class="text-caption text-medium-emphasis">JSON</span>
      </div>
    </v-card>

    <v-snackbar v-model="tipShow" :timeout="2000">
      {{ tipMsg }}
    </v-snackbar>
  </v-main>
</template>

<style scoped>
.editor-card {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  border-radius: 8px;
  overflow: hidden;
}

.tab-bar {
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  min-height: 36px;
  padding: 0 4px;
  flex-shrink: 0;
}

.tab-items {
  overflow-x: auto;
}

.tab-item {
  height: 36px;
  cursor: pointer;
  border-right: 1px solid #e0e0e0;
  background-color: #ececec;
  user-select: none;
  white-space: nowrap;
  transition: background-color 0.15s;
}

.tab-item:hover {
  background-color: #e0e0e0;
}

.tab-item.tab-active {
  background-color: #ffffff;
  border-bottom: 2px solid #1a73e8;
  color: #1a73e8;
  font-weight: 600;
}

.tab-title {
  font-size: 13px;
}

.tab-add {
  height: 36px;
  width: 36px;
  cursor: pointer;
  transition: background-color 0.15s;
  flex-shrink: 0;
}

.tab-add:hover {
  background-color: #e0e0e0;
}

.tab-close {
  opacity: 0;
  transition: opacity 0.15s;
  border-radius: 4px;
}

.tab-item:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.toolbar {
  background-color: #fafafa;
  flex-shrink: 0;
  border-bottom: 1px solid #eeeeee;
}

.editor-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.status-bar {
  height: 24px;
  background-color: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}
</style>
