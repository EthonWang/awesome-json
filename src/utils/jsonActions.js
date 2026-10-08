import { translateMessage } from '../i18n/message.js'
import { describeJsonError } from './jsonError.js'

export function parseJsonInput(text, label = 'JSON') {
  if (!text.trim()) {
    const translation = { key: 'common:inputRequired', values: { label } }
    return { ok: false, message: translateMessage(translation), translation, kind: 'warning' }
  }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (error) {
    const translation = describeJsonError(error, text, label, true)
    return { ok: false, message: translateMessage(translation), translation, kind: 'error' }
  }
}

export function jsonError(text, descriptor = false) {
  if (!text.trim()) return ''
  try {
    JSON.parse(text)
    return ''
  } catch (error) {
    return describeJsonError(error, text, 'JSON', descriptor)
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
