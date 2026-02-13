<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { diffJson, formatJsonWithPaths, markDiffLines, DiffType } from '@/utils/jsonDiff.js'

const props = defineProps({
  leftJson: { type: String, default: '' },
  rightJson: { type: String, default: '' },
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const diffs = ref([])
const leftLines = ref([])
const rightLines = ref([])
const currentDiffIndex = ref(-1)
const errorMsg = ref('')

const showMissing = ref(true)
const showTypes = ref(true)
const showEquality = ref(true)

const leftCodeRef = ref(null)
const rightCodeRef = ref(null)

const filteredDiffTypes = computed(() => {
  const types = new Set()
  if (showMissing.value) types.add(DiffType.MISSING)
  if (showTypes.value) types.add(DiffType.TYPE)
  if (showEquality.value) types.add(DiffType.EQUALITY)
  return types
})

const missingCount = computed(() => diffs.value.filter(d => d.type === DiffType.MISSING).length)
const typeCount = computed(() => diffs.value.filter(d => d.type === DiffType.TYPE).length)
const eqCount = computed(() => diffs.value.filter(d => d.type === DiffType.EQUALITY).length)

const currentDiff = computed(() => {
  if (currentDiffIndex.value >= 0 && currentDiffIndex.value < diffs.value.length) {
    return diffs.value[currentDiffIndex.value]
  }
  return null
})

watch(() => props.visible, (val) => {
  if (val) {
    performDiff()
  }
})

function performDiff() {
  errorMsg.value = ''
  diffs.value = []
  leftLines.value = []
  rightLines.value = []
  currentDiffIndex.value = -1

  let leftObj, rightObj
  try {
    leftObj = JSON.parse(props.leftJson)
  } catch (e) {
    errorMsg.value = `左侧 JSON 解析失败: ${e.message}`
    return
  }
  try {
    rightObj = JSON.parse(props.rightJson)
  } catch (e) {
    errorMsg.value = `右侧 JSON 解析失败: ${e.message}`
    return
  }

  const rawDiffs = diffJson(leftObj, rightObj)
  diffs.value = rawDiffs

  const rawLeftLines = formatJsonWithPaths(leftObj, true)
  const rawRightLines = formatJsonWithPaths(rightObj, true)

  leftLines.value = markDiffLines(rawLeftLines, rawDiffs, 'left')
  rightLines.value = markDiffLines(rawRightLines, rawDiffs, 'right')

  if (rawDiffs.length > 0) {
    nextTick(() => {
      currentDiffIndex.value = 0
    })
  }
}

function getLineClass(line) {
  if (!line.diffType) return ''
  if (!filteredDiffTypes.value.has(line.diffType)) return 'diff-hidden'

  const classes = ['diff-line']
  classes.push(`diff-${line.diffType}`)

  if (currentDiff.value && line.diffIndex === currentDiffIndex.value) {
    classes.push('diff-selected')
  }
  return classes.join(' ')
}

function getIndent(depth) {
  return '    '.repeat(depth)
}

function handleLineClick(line) {
  if (line.diffIndex !== null && line.diffIndex !== undefined) {
    currentDiffIndex.value = line.diffIndex
    scrollToCurrentDiff()
  }
}

function gotoPrevDiff() {
  if (currentDiffIndex.value > 0) {
    currentDiffIndex.value--
    scrollToCurrentDiff()
  }
}

function gotoNextDiff() {
  if (currentDiffIndex.value < diffs.value.length - 1) {
    currentDiffIndex.value++
    scrollToCurrentDiff()
  }
}

function scrollToCurrentDiff() {
  if (currentDiffIndex.value < 0) return

  nextTick(() => {
    const leftEl = leftCodeRef.value?.querySelector(`.diff-line[data-diff-index="${currentDiffIndex.value}"]`)
    const rightEl = rightCodeRef.value?.querySelector(`.diff-line[data-diff-index="${currentDiffIndex.value}"]`)

    const target = leftEl || rightEl
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

function handleKeydown(event) {
  if (!props.visible) return
  if (event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT') return

  if (event.key === 'ArrowRight' || event.key === 'n' || event.key === 'N') {
    event.preventDefault()
    gotoNextDiff()
  } else if (event.key === 'ArrowLeft' || event.key === 'p' || event.key === 'P') {
    event.preventDefault()
    gotoPrevDiff()
  }
}

function handleNewDiff() {
  emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="visible" class="diff-container">
    <!-- 错误提示 -->
    <v-alert v-if="errorMsg" type="error" variant="tonal" closable class="mb-4">
      {{ errorMsg }}
    </v-alert>

    <!-- 悬浮控制面板 -->
    <div v-if="!errorMsg && diffs.length > 0" class="diff-floating-panel">
      <v-card elevation="8" rounded="lg" class="pa-3">
        <!-- 差异数量 -->
        <div class="panel-title">
          <v-icon size="small" color="indigo" class="mr-1">mdi-file-compare</v-icon>
          <strong>{{ diffs.length }}</strong> 处差异
        </div>

        <v-divider class="my-2"></v-divider>

        <!-- 导航 -->
        <div class="panel-nav">
          <v-btn icon size="small" variant="text" :disabled="currentDiffIndex <= 0" @click="gotoPrevDiff"
            title="上一个差异 (P / ←)">
            <v-icon>mdi-chevron-up</v-icon>
          </v-btn>
          <span class="panel-nav-label">{{ currentDiffIndex + 1 }} / {{ diffs.length }}</span>
          <v-btn icon size="small" variant="text" :disabled="currentDiffIndex >= diffs.length - 1"
            @click="gotoNextDiff" title="下一个差异 (N / →)">
            <v-icon>mdi-chevron-down</v-icon>
          </v-btn>
        </div>

        <v-divider class="my-2"></v-divider>

        <!-- 过滤器 -->
        <div class="panel-filters">
          <v-chip v-if="missingCount > 0" :variant="showMissing ? 'flat' : 'outlined'"
            :color="showMissing ? 'success' : ''" size="x-small" @click="showMissing = !showMissing" class="mb-1">
            {{ missingCount }} 缺失
          </v-chip>
          <v-chip v-if="typeCount > 0" :variant="showTypes ? 'flat' : 'outlined'"
            :color="showTypes ? 'error' : ''" size="x-small" @click="showTypes = !showTypes" class="mb-1">
            {{ typeCount }} 类型
          </v-chip>
          <v-chip v-if="eqCount > 0" :variant="showEquality ? 'flat' : 'outlined'"
            :color="showEquality ? 'warning' : ''" size="x-small" @click="showEquality = !showEquality" class="mb-1">
            {{ eqCount }} 值不等
          </v-chip>
        </div>

        <v-divider class="my-2"></v-divider>

        <!-- 当前差异详情 -->
        <div v-if="currentDiff" class="panel-detail">
          <div class="panel-detail-path" :title="currentDiff.path">
            <code>{{ currentDiff.path }}</code>
          </div>
          <div class="panel-detail-msg">{{ currentDiff.msg }}</div>
        </div>

        <v-divider class="my-2"></v-divider>

        <v-btn block variant="outlined" size="small" @click="handleNewDiff" prepend-icon="mdi-close">
          关闭diff
        </v-btn>
      </v-card>
    </div>

    <!-- 无差异 + 收起按钮 -->
    <div v-if="!errorMsg && diffs.length === 0 && leftLines.length > 0" class="diff-no-diff mb-4">
      <v-alert type="success" variant="tonal" density="compact">
        两侧 JSON 语义完全相同
      </v-alert>
      <v-btn variant="outlined" size="small" class="mt-2" @click="handleNewDiff" prepend-icon="mdi-close">
        关闭diff
      </v-btn>
    </div>

    <!-- 对比区域 -->
    <div v-if="!errorMsg && leftLines.length > 0" class="diff-body">
      <div class="diff-pane" ref="leftCodeRef">
        <div class="diff-pane-header">
          <v-icon size="small" class="mr-1">mdi-arrow-left-bold</v-icon>
          Left
        </div>
        <div class="code-block">
          <div v-for="(line, idx) in leftLines" :key="'l' + idx" class="code-line"
            :class="getLineClass(line)" :data-diff-index="line.diffIndex"
            @click="handleLineClick(line)">
            <span class="line-number">{{ idx + 1 }}</span>
            <span class="line-content"><span class="indent">{{ getIndent(line.depth) }}</span>{{ line.text }}</span>
          </div>
        </div>
      </div>

      <div class="diff-pane" ref="rightCodeRef">
        <div class="diff-pane-header">
          <v-icon size="small" class="mr-1">mdi-arrow-right-bold</v-icon>
          Right
        </div>
        <div class="code-block">
          <div v-for="(line, idx) in rightLines" :key="'r' + idx" class="code-line"
            :class="getLineClass(line)" :data-diff-index="line.diffIndex"
            @click="handleLineClick(line)">
            <span class="line-number">{{ idx + 1 }}</span>
            <span class="line-content"><span class="indent">{{ getIndent(line.depth) }}</span>{{ line.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-container {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px solid #e0e0e0;
}

/* 悬浮控制面板 */
.diff-floating-panel {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 1000;
  width: 220px;
}

.panel-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
}

.panel-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.panel-nav-label {
  font-size: 0.85rem;
  color: #666;
  min-width: 50px;
  text-align: center;
}

.panel-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.panel-detail {
  font-size: 0.8rem;
  line-height: 1.4;
}

.panel-detail-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.panel-detail-path code {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: Monaco, 'Courier New', monospace;
  font-size: 0.85em;
}

.panel-detail-msg {
  color: #666;
  word-break: break-all;
}

/* 对比区域 */
.diff-body {
  display: flex;
  gap: 16px;
}

.diff-pane {
  flex: 1;
  min-width: 0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.diff-pane-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 500;
  font-size: 0.9rem;
  color: #555;
}

.code-block {
  overflow: auto;
  max-height: 70vh;
  font-family: Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 20px;
}

.code-line {
  display: flex;
  white-space: pre;
  min-height: 20px;
}

.code-line:hover {
  background: rgba(0, 0, 0, 0.02);
}

.line-number {
  flex-shrink: 0;
  width: 45px;
  text-align: right;
  padding-right: 8px;
  color: #bbb;
  user-select: none;
  border-right: 1px solid #eee;
  margin-right: 8px;
}

.line-content {
  flex: 1;
  padding-right: 8px;
}

.indent {
  white-space: pre;
}

.diff-line {
  cursor: pointer;
}

.diff-eq .line-content {
  background: rgba(255, 170, 0, 0.1);
  color: #8a6d3b;
}

.diff-type .line-content {
  background: rgba(220, 100, 100, 0.1);
  color: #c00;
}

.diff-missing .line-content {
  background: rgba(0, 160, 80, 0.1);
  color: #2e7d32;
}

.diff-selected .line-content {
  background: #bbdefb !important;
  color: #1565c0 !important;
}

.diff-hidden {
  cursor: default;
}

.diff-hidden .line-content {
  background: transparent !important;
  color: inherit !important;
}

@media (max-width: 960px) {
  .diff-body {
    flex-direction: column;
  }

  .diff-floating-panel {
    width: 180px;
    right: 12px;
    top: 70px;
  }
}
</style>
