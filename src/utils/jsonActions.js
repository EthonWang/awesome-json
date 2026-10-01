import { describeJsonError } from './jsonError.js'

export function parseJsonInput(text, label = 'JSON') {
  if (!text.trim()) return { ok: false, message: '请先输入' + label + '。', kind: 'warning' }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (error) {
    return { ok: false, message: describeJsonError(error, text, label), kind: 'error' }
  }
}

export function jsonError(text) {
  if (!text.trim()) return ''
  try {
    JSON.parse(text)
    return ''
  } catch (error) {
    return describeJsonError(error, text)
  }
}

export function addEscaping(text) {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
}

export function removeEscaping(text) {
  return text.replace(/\\\\/g, '\x00').replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\x00/g, '\\')
}

export function jsonType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array · ' + value.length
  return typeof value
}
