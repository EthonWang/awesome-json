<script setup>
import { ref, nextTick, watch } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import JsonDiff from '@/components/JsonDiff.vue'

const leftJson = ref('')
const rightJson = ref('')

const sampleLeftJson = `{"name":"alpha","version":3,"enabled":true,"config":{"mode":"fast","retries":5,"verbose":false},"items":[{"id":"a1","label":"foo","value":100,"tags":["x","y","z"],"meta":null},{"id":"a2","label":"bar","value":200,"tags":["x"],"meta":{"flag":true}},{"id":"a3","label":"baz","value":300,"tags":["y","z"],"meta":null}],"extra":"hello"}`
const sampleRightJson = `{"name":"alpha","version":"3","enabled":true,"config":{"mode":"safe","retries":8,"timeout":30},"items":[{"id":"a1","label":"foo","value":150,"tags":["x","y"],"meta":"none"},{"id":"a2","label":"qux","value":200,"tags":["x","w"],"meta":{"flag":false,"note":"test"}}],"limit":10}`

function loadSampleData() {
  leftJson.value = JSON.stringify(JSON.parse(sampleLeftJson), null, 2)
  rightJson.value = JSON.stringify(JSON.parse(sampleRightJson), null, 2)
}

const jsonShowDialog = ref(false)
const jsonShowData = ref({})
const jsonViewerContainer = ref(null)
const jsonViewerHeight = ref(500)

watch(jsonShowDialog, (val) => {
  if (val) {
    nextTick(() => {
      setTimeout(() => {
        if (jsonViewerContainer.value?.$el) {
          jsonViewerHeight.value = jsonViewerContainer.value.$el.clientHeight - 24
        } else if (jsonViewerContainer.value) {
          jsonViewerHeight.value = jsonViewerContainer.value.clientHeight - 24
        }
      }, 100)
    })
  }
})

const tipShow = ref(false)
const tipMsg = ref('')

const showDiff = ref(false)
const diffAnchorRef = ref(null)

function formatJson(side) {
  if (parseJson(side)) {
    const target = side === 'left' ? leftJson : rightJson
    target.value = JSON.stringify(JSON.parse(target.value), null, 2)
  }
}

function parseJson(side) {
  const value = side === 'left' ? leftJson.value : rightJson.value
  try {
    JSON.parse(value)
    return true
  } catch (e) {
    tipMsg.value = String(e)
    tipShow.value = true
    return false
  }
}

function removeEscaping(side) {
  const target = side === 'left' ? leftJson : rightJson
  target.value = target.value
    .replace(/\\\\/g, '\x00')
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\x00/g, '\\')
}

function addEscaping(side) {
  const target = side === 'left' ? leftJson : rightJson
  target.value = target.value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

function compressJson(side) {
  if (parseJson(side)) {
    const target = side === 'left' ? leftJson : rightJson
    target.value = JSON.stringify(JSON.parse(target.value))
  }
}

function copyJson(side) {
  const value = side === 'left' ? leftJson.value : rightJson.value
  navigator.clipboard.writeText(value).then(() => {
    tipMsg.value = '已复制到剪贴板'
    tipShow.value = true
  }).catch(err => {
    tipMsg.value = '复制失败: ' + err
    tipShow.value = true
  })
}

function openViewer(side) {
  if (parseJson(side)) {
    const value = side === 'left' ? leftJson.value : rightJson.value
    jsonShowData.value = JSON.parse(value)
    jsonShowDialog.value = true
  }
}

function cleanJson(side) {
  const target = side === 'left' ? leftJson : rightJson
  target.value = ''
}

function startDiff() {
  if (parseJson('left') && parseJson('right')) {
    showDiff.value = false
    nextTick(() => {
      showDiff.value = true
      nextTick(() => {
        diffAnchorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }
}

function closeDiff() {
  showDiff.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <v-main class="ma-6">
    <!-- DIFF 按钮 -->
    <div class="mb-4">
      <v-btn prepend-icon="mdi-file-compare" color="indigo-darken-3" size="large" @click="startDiff">
        DIFF
      </v-btn>
      <v-btn variant="text" class="ml-2 text-decoration-underline" size="small" @click="loadSampleData">
        加载示例数据
      </v-btn>
    </div>

    <v-row>
      <!-- 左侧 -->
      <v-col cols="12" md="6">
        <v-row class="mt-4 mb-2 ml-1">
          <div>
            <v-btn class="mr-1 mb-2" density="comfortable" @click="formatJson('left')">格式化</v-btn>
            <v-btn class="mr-1 mb-2" density="comfortable" @click="openViewer('left')">可视化</v-btn>
            <v-btn class="mr-1 mb-2" density="comfortable" @click="removeEscaping('left')">去转义</v-btn>
            <v-btn class="mr-1 mb-2" density="comfortable" @click="addEscaping('left')">转义</v-btn>
            <v-btn class="mr-1 mb-2" density="comfortable" @click="compressJson('left')">压缩</v-btn>
            <v-btn class="mr-1 mb-2" color="secondary" density="comfortable" @click="copyJson('left')">复制</v-btn>
            <v-btn class="mr-1 mb-2" color="red" density="comfortable" @click="cleanJson('left')">清空</v-btn>
          </div>
        </v-row>
        <v-sheet rounded="lg">
          <v-textarea label="左侧 JSON" placeholder="在此处输入 JSON" variant="outlined" rows="10" no-resize
            v-model="leftJson"></v-textarea>
        </v-sheet>
      </v-col>

      <!-- 右侧 -->
      <v-col cols="12" md="6">
        <v-row class="mt-4 mb-2 ml-1">
          <div>
            <v-btn class="mr-1 mb-2" density="comfortable" @click="formatJson('right')">格式化</v-btn>
            <v-btn class="mr-1 mb-2" density="comfortable" @click="openViewer('right')">可视化</v-btn>
            <v-btn class="mr-1 mb-2" density="comfortable" @click="removeEscaping('right')">去转义</v-btn>
            <v-btn class="mr-1 mb-2" density="comfortable" @click="addEscaping('right')">转义</v-btn>
            <v-btn class="mr-1 mb-2" density="comfortable" @click="compressJson('right')">压缩</v-btn>
            <v-btn class="mr-1 mb-2" color="secondary" density="comfortable" @click="copyJson('right')">复制</v-btn>
            <v-btn class="mr-1 mb-2" color="red" density="comfortable" @click="cleanJson('right')">清空</v-btn>
          </div>
        </v-row>
        <v-sheet rounded="lg">
          <v-textarea label="右侧 JSON" placeholder="在此处输入 JSON" variant="outlined" rows="10" no-resize
            v-model="rightJson"></v-textarea>
        </v-sheet>
      </v-col>
    </v-row>

    <!-- Diff 结果锚点 + 区域 -->
    <div ref="diffAnchorRef"></div>
    <JsonDiff :left-json="leftJson" :right-json="rightJson" :visible="showDiff" @close="closeDiff" />
  </v-main>

  <!-- JSON 可视化弹窗 -->
  <v-dialog v-model="jsonShowDialog" width="85vw" height="85vh">
    <v-card class="d-flex flex-column" style="height: 100%;">
      <v-card-title class="d-flex align-center flex-shrink-0">
        <v-icon class="mr-2">mdi-format-list-bulleted-type</v-icon>
        JSON 可视化
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="jsonShowDialog = false"></v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text ref="jsonViewerContainer" class="flex-grow-1 overflow-hidden pa-0" style="min-height: 0;">
        <vue-json-pretty :data="jsonShowData" :deep="5" :show-double-quotes="true" :show-length="true"
          :virtual="true" :height="jsonViewerHeight" :show-line="true" :show-line-number="true"
          :collapsed-on-click-brackets="true" :show-icon="true" :show-key-value-space="true"
          class="json-viewer-tree" />
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- 提示信息 -->
  <v-snackbar v-model="tipShow" :timeout="2000">
    {{ tipMsg }}
  </v-snackbar>
</template>

<style scoped>
</style>
