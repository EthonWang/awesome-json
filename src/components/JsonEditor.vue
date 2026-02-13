<script setup>
import { ref, onMounted, onBeforeUnmount, shallowRef, watch } from 'vue'
import { basicSetup, EditorView } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { placeholder } from '@codemirror/view'

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
    text = text.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\\/g, '\\')
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
