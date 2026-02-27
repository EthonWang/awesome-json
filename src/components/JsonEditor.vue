<script setup>
import { ref, onMounted, onBeforeUnmount, shallowRef, watch } from 'vue'
import { basicSetup, EditorView } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { placeholder } from '@codemirror/view'
import { codeFolding } from '@codemirror/language'

function prepareFoldPlaceholder(state, range) {
  const charBefore = range.from > 0 ? state.doc.sliceString(range.from - 1, range.from) : ''
  const charAfter = range.to < state.doc.length ? state.doc.sliceString(range.to, range.to + 1) : ''
  
  // Determine bracket type
  const isArray = charBefore === '[' || charAfter === ']'
  const isObject = charBefore === '{' || charAfter === '}'
  if (!isArray && !isObject) return null

  // Try to parse the full bracketed text to count items
  const fullText = state.doc.sliceString(range.from - 1, range.to + 1)
  try {
    const parsed = JSON.parse(fullText)
    if (Array.isArray(parsed)) {
      return { type: 'array', count: parsed.length }
    } else if (typeof parsed === 'object' && parsed !== null) {
      return { type: 'object', count: Object.keys(parsed).length }
    }
  } catch {
    // parse failed, return type without count
  }
  return { type: isArray ? 'array' : 'object', count: null }
}

const props = defineProps({
  modelValue: { type: String, default: '' },
  autoFormat: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'error'])

const editorContainer = ref(null)
const editorView = shallowRef(null)
let autoFormatTimer = null
let isInternalUpdate = false

function getContent() {
  if (!editorView.value) return ''
  return editorView.value.state.doc.toString()
}

function setContent(text) {
  if (!editorView.value) return
  isInternalUpdate = true
  editorView.value.dispatch({
    changes: { from: 0, to: editorView.value.state.doc.length, insert: text }
  })
  isInternalUpdate = false
}

function validateJson() {
  const text = getContent().trim()
  if (!text) { emit('error', ''); return false }
  try {
    JSON.parse(text)
    emit('error', '')
    return true
  } catch (e) {
    emit('error', e.message)
    return false
  }
}

function autoFormatJson() {
  const text = getContent().trim()
  if (!text) return
  try {
    const obj = JSON.parse(text)
    const formatted = JSON.stringify(obj, null, 2)
    if (formatted !== getContent()) {
      isInternalUpdate = true
      const cursor = editorView.value.state.selection.main.head
      setContent(formatted)
      const newCursor = Math.min(cursor, formatted.length)
      editorView.value.dispatch({ selection: { anchor: newCursor } })
      emit('update:modelValue', formatted)
      isInternalUpdate = false
    }
    emit('error', '')
  } catch {
    // JSON 不完整，不处理
  }
}

function triggerAutoFormat() {
  if (!props.autoFormat || isInternalUpdate) return
  clearTimeout(autoFormatTimer)
  autoFormatTimer = setTimeout(autoFormatJson, 800)
}

// 暴露方法给父组件
defineExpose({
  getContent,
  setContent,
  validateJson,
  formatJson() {
    const text = getContent().trim()
    if (!text) return
    try {
      const obj = JSON.parse(text)
      const formatted = JSON.stringify(obj, null, 2)
      setContent(formatted)
      emit('update:modelValue', formatted)
      emit('error', '')
    } catch (e) {
      emit('error', e.message)
    }
  },
  compressJson() {
    const text = getContent().trim()
    if (!text) return
    try {
      const obj = JSON.parse(text)
      const compressed = JSON.stringify(obj)
      setContent(compressed)
      emit('update:modelValue', compressed)
      emit('error', '')
    } catch (e) {
      emit('error', e.message)
    }
  },
  copyJson() {
    return navigator.clipboard.writeText(getContent())
  },
  clearAll() {
    setContent('')
    emit('update:modelValue', '')
    emit('error', '')
  },
  removeEscaping() {
    let text = getContent()
    text = text.replace(/\\\\/g, '\x00').replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\x00/g, '\\')
    setContent(text)
    emit('update:modelValue', text)
  },
  addEscaping() {
    let text = getContent()
    text = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
    setContent(text)
    emit('update:modelValue', text)
  },
})

// 外部 modelValue 变化时同步到编辑器
watch(() => props.modelValue, (val) => {
  if (!isInternalUpdate && editorView.value && val !== getContent()) {
    setContent(val)
  }
})

onMounted(() => {
  const state = EditorState.create({
    doc: props.modelValue || '',
    extensions: [
      basicSetup,
      json(),
      codeFolding({
        preparePlaceholder(state, range) {
          return prepareFoldPlaceholder(state, range)
        },
        placeholderDOM(view, onclick, prepared) {
          const el = document.createElement('span')
          el.className = 'cm-fold-placeholder'
          el.style.cssText = 'cursor: pointer; color: #1a73e8; background: #e8f0fe; border: 1px solid #c2d7f5; border-radius: 3px; padding: 0 4px; font-size: 12px; margin: 0 2px;'
          if (prepared && prepared.count !== null) {
            el.textContent = prepared.type === 'array'
              ? `[ ... ${prepared.count} items ]`
              : `{ ... ${prepared.count} keys }`
          } else if (prepared) {
            el.textContent = prepared.type === 'array' ? '[ ... ]' : '{ ... }'
          } else {
            el.textContent = '…'
          }
          el.title = '点击展开'
          el.onclick = onclick
          return el
        },
      }),
      placeholder('在此处输入 JSON'),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isInternalUpdate) {
          const content = getContent()
          emit('update:modelValue', content)
          validateJson()
          triggerAutoFormat()
        }
      }),
      EditorView.theme({
        '&': { height: '100%', fontSize: '14px' },
        '.cm-scroller': { overflow: 'auto', fontFamily: 'Monaco, Menlo, Consolas, monospace' },
      }),
    ],
  })

  editorView.value = new EditorView({
    state,
    parent: editorContainer.value,
  })
})

onBeforeUnmount(() => {
  clearTimeout(autoFormatTimer)
  editorView.value?.destroy()
})
</script>

<template>
  <div ref="editorContainer" style="height: 100%; overflow: auto;"></div>
</template>
